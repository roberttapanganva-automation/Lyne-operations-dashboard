"use client";

import { PencilSimpleLineIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { PipelineStagesManager } from "@/components/owner/pipeline/PipelineStagesManager";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { PipelineGroup, PipelineStage } from "@/types/domain";

type PipelineGroupsManagerProps = {
  groups: PipelineGroup[];
  stages: PipelineStage[];
};

function sortGroups(groups: PipelineGroup[]) {
  const entityOrder = {
    lead: 0,
    job: 1,
  } as const;

  return [...groups].sort((first, second) => {
    if (entityOrder[first.entity_type] !== entityOrder[second.entity_type]) {
      return entityOrder[first.entity_type] - entityOrder[second.entity_type];
    }

    if (first.order_index !== second.order_index) {
      return first.order_index - second.order_index;
    }

    return (
      new Date(first.created_at).getTime() - new Date(second.created_at).getTime()
    );
  });
}

function sortStages(stages: PipelineStage[]) {
  return [...stages].sort((first, second) => {
    if (first.order_index !== second.order_index) {
      return first.order_index - second.order_index;
    }

    return (
      new Date(first.created_at).getTime() - new Date(second.created_at).getTime()
    );
  });
}

function normalizeGroups(current: PipelineGroup[], nextGroup: PipelineGroup) {
  const base = current.some((group) => group.id === nextGroup.id)
    ? current.map((group) =>
        group.id === nextGroup.id
          ? nextGroup
          : nextGroup.is_default && group.entity_type === nextGroup.entity_type
            ? { ...group, is_default: false }
            : group,
      )
    : [
        ...current.map((group) =>
          nextGroup.is_default && group.entity_type === nextGroup.entity_type
            ? { ...group, is_default: false }
            : group,
        ),
        nextGroup,
      ];

  return sortGroups(base);
}

function getNextGroupOrderIndex(
  groups: PipelineGroup[],
  entityType: PipelineGroup["entity_type"],
) {
  return groups.filter((group) => group.entity_type === entityType).length;
}

function getFriendlyPipelineErrorMessage(fallbackMessage: string, error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallbackMessage;
}

async function parseApiResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<ApiResponse<T>> {
  try {
    return (await response.json()) as ApiResponse<T>;
  } catch {
    return {
      error: {
        code: "INVALID_API_RESPONSE",
        message: fallbackMessage,
      },
      ok: false,
    };
  }
}

function GroupRow({
  group,
  isSelected,
  onDelete,
  onSave,
  onSelect,
}: {
  group: PipelineGroup;
  isSelected: boolean;
  onDelete: (groupId: string) => Promise<void>;
  onSave: (
    groupId: string,
    payload: {
      description: string;
      entity_type: PipelineGroup["entity_type"];
      is_default: boolean;
      name: string;
      order_index: number;
    },
  ) => Promise<void>;
  onSelect: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    const formData = new FormData(event.currentTarget);

    try {
      await onSave(group.id, {
        description: String(formData.get("description") ?? ""),
        entity_type: String(formData.get("entity_type") ?? group.entity_type) as PipelineGroup["entity_type"],
        is_default: formData.get("is_default") === "on",
        name: String(formData.get("name") ?? ""),
        order_index: Number(formData.get("order_index") ?? 0),
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      await onDelete(group.id);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <form
      className={`rounded-lg border p-4 transition ${
        isSelected
          ? "border-[var(--workspace-primary,var(--ops-primary))] bg-[var(--workspace-primary-soft,var(--ops-primary-soft))]"
          : "border-[var(--ops-border)] bg-white"
      }`}
      onSubmit={handleSubmit}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[var(--ops-text)]">
              {group.name}
            </p>
            {group.is_default ? <Badge variant="success">Default</Badge> : null}
            <Badge variant="default">
              {group.entity_type === "lead" ? "Leads" : "Jobs"}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[var(--ops-text-soft)]">
            {group.description?.trim() || "No description yet."}
          </p>
        </div>

        <Button
          className="h-9 gap-2 px-3"
          onClick={onSelect}
          type="button"
          variant={isSelected ? "primary" : "secondary"}
        >
          <PencilSimpleLineIcon aria-hidden="true" size={16} weight="regular" />
          {isSelected ? "Selected" : "Manage"}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(140px,1fr)_120px_100px]">
        <input
          className="h-10 rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
          defaultValue={group.name}
          disabled={isSaving || isDeleting}
          name="name"
          placeholder="Pipeline name"
          required
          type="text"
        />
        <select
          className="h-10 rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
          defaultValue={group.entity_type}
          disabled={isSaving || isDeleting}
          name="entity_type"
        >
          <option value="lead">Lead</option>
          <option value="job">Job</option>
        </select>
        <input
          className="h-10 rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
          defaultValue={group.order_index}
          disabled={isSaving || isDeleting}
          min={0}
          name="order_index"
          type="number"
        />
      </div>

      <textarea
        className="mt-3 min-h-20 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 py-2 text-sm text-[var(--ops-text)] outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
        defaultValue={group.description ?? ""}
        disabled={isSaving || isDeleting}
        name="description"
        placeholder="Describe what this pipeline manages."
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-[var(--ops-text-soft)]">
          <input
            className="h-4 w-4 accent-[var(--workspace-primary,var(--ops-primary))]"
            defaultChecked={group.is_default}
            disabled={isSaving || isDeleting}
            name="is_default"
            type="checkbox"
          />
          Default pipeline
        </label>

        <div className="flex flex-wrap gap-2">
          <Button disabled={isSaving || isDeleting} type="submit" variant="secondary">
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            className="gap-2 text-[var(--ops-danger)]"
            disabled={isSaving || isDeleting}
            onClick={handleDelete}
            type="button"
            variant="ghost"
          >
            <TrashIcon aria-hidden="true" size={16} weight="regular" />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function PipelineGroupsManager({
  groups,
  stages,
}: PipelineGroupsManagerProps) {
  const initialGroupEntityType: PipelineGroup["entity_type"] = "lead";
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupEntityType, setNewGroupEntityType] = useState<
    PipelineGroup["entity_type"]
  >(initialGroupEntityType);
  const [newGroupOrderIndex, setNewGroupOrderIndex] = useState(() =>
    getNextGroupOrderIndex(sortGroups(groups), initialGroupEntityType),
  );
  const [newGroupIsDefault, setNewGroupIsDefault] = useState(false);
  const [pipelineGroups, setPipelineGroups] = useState(sortGroups(groups));
  const [pipelineStages, setPipelineStages] = useState(sortStages(stages));
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(
    sortGroups(groups).find((group) => group.is_default)?.id ??
      sortGroups(groups)[0]?.id ??
      null,
  );
  const effectiveSelectedGroupId =
    selectedGroupId && pipelineGroups.some((group) => group.id === selectedGroupId)
      ? selectedGroupId
      : pipelineGroups.find((group) => group.is_default)?.id ??
        pipelineGroups[0]?.id ??
        null;

  const selectedGroup =
    pipelineGroups.find((group) => group.id === effectiveSelectedGroupId) ?? null;
  const selectedStages = useMemo(
    () =>
      sortStages(
        pipelineStages.filter(
          (stage) => stage.pipeline_group_id === effectiveSelectedGroupId,
        ),
      ),
    [effectiveSelectedGroupId, pipelineStages],
  );

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsCreatingGroup(true);

    const duplicateGroup = pipelineGroups.find(
      (group) =>
        group.entity_type === newGroupEntityType &&
        group.name.trim().toLowerCase() === newGroupName.trim().toLowerCase(),
    );

    if (duplicateGroup) {
      const message =
        "A pipeline group with this name already exists for that entity type.";
      setError(message);
      notify.warning("Pipeline group already exists", message);
      setIsCreatingGroup(false);
      return;
    }

    try {
      const response = await fetch("/api/owner/pipeline-groups", {
        body: JSON.stringify({
          description: newGroupDescription,
          entity_type: newGroupEntityType,
          is_default: newGroupIsDefault,
          name: newGroupName,
          order_index: newGroupOrderIndex,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const result = await parseApiResponse<PipelineGroup>(
        response,
        "We could not create the pipeline group.",
      );

      if (!response.ok || !result.ok) {
        const message = result.ok
          ? "We could not create the pipeline group."
          : result.error.message;
        setError(message);
        notify.error("Pipeline group could not be created", message);
        return;
      }

      setPipelineGroups((current) => normalizeGroups(current, result.data));
      setSelectedGroupId(result.data.id);
      setSuccess("Pipeline group created.");
      setNewGroupName("");
      setNewGroupDescription("");
      setNewGroupEntityType(initialGroupEntityType);
      setNewGroupOrderIndex(
        getNextGroupOrderIndex(
          normalizeGroups(pipelineGroups, result.data),
          initialGroupEntityType,
        ),
      );
      setNewGroupIsDefault(false);
      setIsCreateGroupOpen(false);
      notify.success("Pipeline saved", "Pipeline stages were updated.");
      router.refresh();
    } catch (caughtError) {
      const message = getFriendlyPipelineErrorMessage(
        "We could not create the pipeline group.",
        caughtError,
      );
      setError(message);
      notify.error("Pipeline group could not be created", message);
    } finally {
      setIsCreatingGroup(false);
    }
  }

  async function updateGroup(
    groupId: string,
    payload: {
      description: string;
      entity_type: PipelineGroup["entity_type"];
      is_default: boolean;
      name: string;
      order_index: number;
    },
  ) {
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/owner/pipeline-groups/${groupId}`, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });
    const result = await parseApiResponse<PipelineGroup>(
      response,
      "We could not update the pipeline group.",
    );

    if (!response.ok || !result.ok) {
      const message = result.ok
        ? "We could not update the pipeline group."
        : result.error.message;
      setError(message);
      notify.error("Pipeline group could not be saved", message);
      return;
    }

    setPipelineGroups((current) => normalizeGroups(current, result.data));
    setSuccess("Pipeline group updated.");
    notify.success("Pipeline saved", "Pipeline stages were updated.");
    router.refresh();
  }

  async function deleteGroup(groupId: string) {
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/owner/pipeline-groups/${groupId}`, {
      method: "DELETE",
    });
    const result = await parseApiResponse<{ id: string }>(
      response,
      "We could not delete the pipeline group.",
    );

    if (!response.ok || !result.ok) {
      const message = result.ok
        ? "We could not delete the pipeline group."
        : result.error.message;
      setError(message);
      notify.error("Pipeline group could not be deleted", message);
      return;
    }

    setPipelineGroups((current) => current.filter((group) => group.id !== groupId));
    setPipelineStages((current) =>
      current.filter((stage) => stage.pipeline_group_id !== groupId),
    );
    setSuccess("Pipeline group deleted.");
    notify.success("Pipeline saved", "Pipeline stages were updated.");
    router.refresh();
  }

  async function createStage(
    group: PipelineGroup,
    payload: {
      color: string;
      entity_type: PipelineGroup["entity_type"];
      is_closed: boolean;
      is_lost: boolean;
      is_won: boolean;
      name: string;
      order_index: number;
      pipeline_group_id: string;
    },
  ) {
    setError(null);
    setSuccess(null);

    const duplicateStage = pipelineStages.find(
      (stage) =>
        stage.pipeline_group_id === payload.pipeline_group_id &&
        stage.name.trim().toLowerCase() === payload.name.trim().toLowerCase(),
    );

    if (duplicateStage) {
      const message = "A stage with this name already exists in the selected pipeline group.";
      setError(message);
      notify.warning("Stage already exists", message);
      throw new Error(message);
    }

    const response = await fetch("/api/owner/pipeline-stages", {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    const result = await parseApiResponse<PipelineStage>(
      response,
      "We could not create the stage.",
    );

    if (!response.ok || !result.ok) {
      const message = result.ok
        ? "We could not create the stage."
        : result.error.message;
      setError(message);
      notify.error("Stage could not be created", message);
      throw new Error(message);
    }

    setPipelineStages((current) => sortStages([...current, result.data]));
    setSelectedGroupId(group.id);
    setSuccess("Stage created.");
    notify.success("Pipeline saved", "Pipeline stages were updated.");
    router.refresh();
  }

  async function updateStage(
    stageId: string,
    payload: {
      color: string;
      is_closed: boolean;
      is_lost: boolean;
      is_won: boolean;
      name: string;
      order_index: number;
    },
  ) {
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/owner/pipeline-stages/${stageId}`, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
      method: "PATCH",
    });
    const result = await parseApiResponse<PipelineStage>(
      response,
      "We could not update the stage.",
    );

    if (!response.ok || !result.ok) {
      const message = result.ok
        ? "We could not update the stage."
        : result.error.message;
      setError(message);
      notify.error("Stage could not be saved", message);
      return;
    }

    setPipelineStages((current) =>
      sortStages(
        current.map((stage) => (stage.id === stageId ? result.data : stage)),
      ),
    );
    setSuccess("Stage updated.");
    notify.success("Pipeline saved", "Pipeline stages were updated.");
    router.refresh();
  }

  async function deleteStage(stageId: string) {
    setError(null);
    setSuccess(null);

    const response = await fetch(`/api/owner/pipeline-stages/${stageId}`, {
      method: "DELETE",
    });
    const result = await parseApiResponse<{ id: string }>(
      response,
      "We could not delete the stage.",
    );

    if (!response.ok || !result.ok) {
      const message = result.ok
        ? "We could not delete the stage."
        : result.error.message;
      setError(message);
      notify.error("Stage could not be deleted", message);
      return;
    }

    setPipelineStages((current) => current.filter((stage) => stage.id !== stageId));
    setSuccess("Stage deleted.");
    notify.success("Stage deleted", "The pipeline stage was removed.");
    router.refresh();
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {error ? (
        <p
          className="rounded-lg bg-[var(--ops-danger-soft)] p-3 text-sm text-[var(--ops-danger)]"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-lg bg-[var(--ops-success-soft)] p-3 text-sm text-[var(--ops-success)]">
          {success}
        </p>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-card)] p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-[var(--ops-text)]">
                  Pipeline groups
                </h2>
                <Badge variant="default">Owner only</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--ops-text-soft)]">
                Create lead and job pipeline folders, choose defaults, and control
                ordering for the workspace board.
              </p>
            </div>
            <Button
              aria-expanded={isCreateGroupOpen}
              aria-label={
                isCreateGroupOpen
                  ? "Hide pipeline group form"
                  : "Add pipeline group"
              }
              className="h-9 w-9 shrink-0 p-0"
              onClick={() => setIsCreateGroupOpen((current) => !current)}
              title={
                isCreateGroupOpen
                  ? "Hide pipeline group form"
                  : "Add pipeline group"
              }
              type="button"
              variant="secondary"
            >
              <PlusIcon
                aria-hidden="true"
                className={`transition ${isCreateGroupOpen ? "rotate-45" : ""}`}
                size={17}
                weight="bold"
              />
            </Button>
          </div>

          {isCreateGroupOpen ? (
            <form
              className="mt-5 rounded-lg border border-dashed border-[var(--ops-border-strong)] bg-[var(--ops-card-soft)] p-4"
              onSubmit={createGroup}
            >
            <div className="grid gap-3 lg:grid-cols-[minmax(140px,1fr)_120px_100px]">
              <input
                className="h-10 rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                disabled={isCreatingGroup}
                name="name"
                onChange={(event) => setNewGroupName(event.target.value)}
                placeholder="Pipeline group name"
                required
                type="text"
                value={newGroupName}
              />
              <select
                className="h-10 rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                disabled={isCreatingGroup}
                name="entity_type"
                onChange={(event) => {
                  const nextEntityType = event.target.value as PipelineGroup["entity_type"];
                  setNewGroupEntityType(nextEntityType);
                  setNewGroupOrderIndex(
                    getNextGroupOrderIndex(pipelineGroups, nextEntityType),
                  );
                }}
                value={newGroupEntityType}
              >
                <option value="lead">Lead</option>
                <option value="job">Job</option>
              </select>
              <input
                className="h-10 rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                disabled={isCreatingGroup}
                min={0}
                name="order_index"
                onChange={(event) =>
                  setNewGroupOrderIndex(Number(event.target.value || 0))
                }
                type="number"
                value={newGroupOrderIndex}
              />
            </div>

            <textarea
              className="mt-3 min-h-20 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 py-2 text-sm text-[var(--ops-text)] outline-none transition placeholder:text-[var(--ops-text-muted)] focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
              disabled={isCreatingGroup}
              name="description"
              onChange={(event) => setNewGroupDescription(event.target.value)}
              placeholder="Optional description for this workflow."
              value={newGroupDescription}
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-[var(--ops-text-soft)]">
                <input
                  className="h-4 w-4 accent-[var(--workspace-primary,var(--ops-primary))]"
                  checked={newGroupIsDefault}
                  disabled={isCreatingGroup}
                  name="is_default"
                  onChange={(event) => setNewGroupIsDefault(event.target.checked)}
                  type="checkbox"
                />
                Set as default
              </label>
              <Button className="gap-2" disabled={isCreatingGroup} type="submit">
                <PlusIcon aria-hidden="true" size={16} weight="regular" />
                {isCreatingGroup ? "Creating..." : "Add group"}
              </Button>
            </div>
            </form>
          ) : null}

          <div className="mt-5 max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {pipelineGroups.length === 0 ? (
              <EmptyState
                description="No pipeline groups yet. Add the first group to start defining workflows."
                title="No groups configured"
              />
            ) : (
              pipelineGroups.map((group) => (
                <GroupRow
                  group={group}
                  isSelected={group.id === effectiveSelectedGroupId}
                  key={group.id}
                  onDelete={deleteGroup}
                  onSave={updateGroup}
                  onSelect={() => setSelectedGroupId(group.id)}
                />
              ))
            )}
          </div>
        </div>

        <PipelineStagesManager
          key={selectedGroup?.id ?? "no-pipeline-group"}
          group={selectedGroup}
          onCreate={createStage}
          onDelete={deleteStage}
          onUpdate={updateStage}
          stages={selectedStages}
        />
      </div>
    </div>
  );
}
