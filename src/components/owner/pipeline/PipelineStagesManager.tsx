"use client";

import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { DEFAULT_BRAND } from "@/lib/branding/defaults";
import type { PipelineGroup, PipelineStage } from "@/types/domain";

function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed.toUpperCase() : trimmed;
}

function isHexColor(value: string) {
  return /^#[0-9A-F]{6}$/.test(normalizeHexColor(value));
}

function getNextStageOrderIndex(stages: PipelineStage[]) {
  return stages.length;
}

type PipelineStagesManagerProps = {
  group: PipelineGroup | null;
  onCreate: (
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
  ) => Promise<void>;
  onDelete: (stageId: string) => Promise<void>;
  onUpdate: (
    stageId: string,
    payload: {
      color: string;
      is_closed: boolean;
      is_lost: boolean;
      is_won: boolean;
      name: string;
      order_index: number;
    },
  ) => Promise<void>;
  stages: PipelineStage[];
};

function stagePayloadFromForm(form: HTMLFormElement) {
  const formData = new FormData(form);

  return {
    color: String(formData.get("color") ?? ""),
    is_closed: formData.get("is_closed") === "on",
    is_lost: formData.get("is_lost") === "on",
    is_won: formData.get("is_won") === "on",
    name: String(formData.get("name") ?? ""),
    order_index: Number(formData.get("order_index") ?? 0),
  };
}

function StageRow({
  onDelete,
  onUpdate,
  stage,
}: {
  onDelete: (stageId: string) => Promise<void>;
  onUpdate: (
    stageId: string,
    payload: ReturnType<typeof stagePayloadFromForm>,
  ) => Promise<void>;
  stage: PipelineStage;
}) {
  const [color, setColor] = useState(stage.color);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      await onUpdate(stage.id, stagePayloadFromForm(event.currentTarget));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);

    try {
      await onDelete(stage.id);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <form
      className="rounded-lg border border-[var(--ops-border)] bg-white p-4"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(160px,1fr)_120px_100px]">
        <div>
          <label
            className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]"
            htmlFor={`owner-stage-name-${stage.id}`}
          >
            Name
          </label>
          <input
            className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
            defaultValue={stage.name}
            disabled={isSaving || isDeleting}
            id={`owner-stage-name-${stage.id}`}
            name="name"
            required
            type="text"
          />
        </div>
        <div>
          <label
            className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]"
            htmlFor={`owner-stage-color-${stage.id}`}
          >
            Color
          </label>
          <div className="mt-2 flex h-10 items-center gap-2 rounded-lg border border-[var(--ops-border)] bg-white px-3">
            <span
              aria-hidden="true"
              className="h-4 w-4 rounded-full border border-[var(--ops-border)]"
              style={{
                backgroundColor: isHexColor(color)
                  ? normalizeHexColor(color)
                  : "#CBD5E1",
              }}
            />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--ops-text)] outline-none"
              disabled={isSaving || isDeleting}
              id={`owner-stage-color-${stage.id}`}
              name="color"
              onChange={(event) =>
                setColor(normalizeHexColor(event.target.value))
              }
              required
              type="text"
              value={color}
            />
            <input
              aria-label="Pick stage color"
              className="h-6 w-8 cursor-pointer appearance-none rounded border border-[var(--ops-border)] bg-transparent p-0"
              disabled={isSaving || isDeleting}
              onChange={(event) =>
                setColor(normalizeHexColor(event.target.value))
              }
              type="color"
              value={isHexColor(color) ? normalizeHexColor(color) : DEFAULT_BRAND.primaryColor}
            />
          </div>
        </div>
        <div>
          <label
            className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]"
            htmlFor={`owner-stage-order-${stage.id}`}
          >
            Order
          </label>
          <input
            className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
            defaultValue={stage.order_index}
            disabled={isSaving || isDeleting}
            id={`owner-stage-order-${stage.id}`}
            min={0}
            name="order_index"
            type="number"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--ops-text-soft)]">
        {[
          ["is_closed", "Closed", stage.is_closed],
          ["is_won", "Won", stage.is_won],
          ["is_lost", "Lost", stage.is_lost],
        ].map(([key, label, checked]) => (
          <label className="inline-flex items-center gap-2" key={String(key)}>
            <input
              className="h-4 w-4 accent-[var(--workspace-primary,var(--ops-primary))]"
              defaultChecked={Boolean(checked)}
              disabled={isSaving || isDeleting}
              name={String(key)}
              type="checkbox"
            />
            {label}
          </label>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
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
    </form>
  );
}

export function PipelineStagesManager({
  group,
  onCreate,
  onDelete,
  onUpdate,
  stages,
}: PipelineStagesManagerProps) {
  const [color, setColor] = useState<string>(DEFAULT_BRAND.primaryColor);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [newStageOrderIndex, setNewStageOrderIndex] = useState(
    getNextStageOrderIndex(stages),
  );
  const [newStageIsClosed, setNewStageIsClosed] = useState(false);
  const [newStageIsWon, setNewStageIsWon] = useState(false);
  const [newStageIsLost, setNewStageIsLost] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!group) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onCreate(group, {
        color,
        entity_type: group.entity_type,
        is_closed: newStageIsClosed,
        is_lost: newStageIsLost,
        is_won: newStageIsWon,
        name: newStageName,
        order_index: newStageOrderIndex,
        pipeline_group_id: group.id,
      });
      setNewStageName("");
      setNewStageOrderIndex(stages.length + 1);
      setNewStageIsClosed(false);
      setNewStageIsWon(false);
      setNewStageIsLost(false);
    } catch {
      return;
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!group) {
    return (
      <div className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-card)] p-5 sm:p-6">
        <EmptyState
          description="Select or create a pipeline group to manage its stages."
          title="No pipeline group selected"
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-card)] p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-[var(--ops-text)]">
              Stages
            </h2>
            <Badge variant="default">
              {group.entity_type === "lead" ? "Lead pipeline" : "Job pipeline"}
            </Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--ops-text-soft)]">
            Manage stages inside <span className="font-semibold">{group.name}</span>.
          </p>
        </div>
      </div>

      <div className="mt-5 max-h-[560px] space-y-3 overflow-y-auto pr-1">
        {stages.length === 0 ? (
          <EmptyState
            description="No stages yet. Add the first stage for this pipeline group."
            title="No stages configured"
          />
        ) : (
          stages.map((stage) => (
            <StageRow
              key={stage.id}
              onDelete={onDelete}
              onUpdate={onUpdate}
              stage={stage}
            />
          ))
        )}

        <form
          className="rounded-lg border border-dashed border-[var(--ops-border-strong)] bg-[var(--ops-card-soft)] p-4"
          onSubmit={handleCreate}
        >
          <div className="grid gap-3 lg:grid-cols-[minmax(180px,1fr)_120px_100px]">
            <div>
              <label
                className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]"
                htmlFor="owner-new-stage-name"
              >
                New stage
              </label>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                disabled={isSubmitting}
                id="owner-new-stage-name"
                name="name"
                onChange={(event) => setNewStageName(event.target.value)}
                placeholder="Add stage"
                required
                type="text"
                value={newStageName}
              />
            </div>
            <div>
              <label
                className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]"
                htmlFor="owner-new-stage-color"
              >
                Color
              </label>
              <div className="mt-2 flex h-10 items-center gap-2 rounded-lg border border-[var(--ops-border)] bg-white px-3">
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded-full border border-[var(--ops-border)]"
                  style={{
                    backgroundColor: isHexColor(color)
                      ? normalizeHexColor(color)
                      : "#CBD5E1",
                  }}
                />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--ops-text)] outline-none"
                  disabled={isSubmitting}
                  id="owner-new-stage-color"
                  onChange={(event) =>
                    setColor(normalizeHexColor(event.target.value))
                  }
                  required
                  type="text"
                  value={color}
                />
                <input
                  aria-label="Pick new stage color"
                  className="h-6 w-8 cursor-pointer appearance-none rounded border border-[var(--ops-border)] bg-transparent p-0"
                  disabled={isSubmitting}
                  onChange={(event) =>
                    setColor(normalizeHexColor(event.target.value))
                  }
                  type="color"
                  value={isHexColor(color) ? normalizeHexColor(color) : DEFAULT_BRAND.primaryColor}
                />
              </div>
            </div>
            <div>
              <label
                className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]"
                htmlFor="owner-new-stage-order"
              >
                Order
              </label>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
                value={newStageOrderIndex}
                disabled={isSubmitting}
                id="owner-new-stage-order"
                min={0}
                name="order_index"
                onChange={(event) =>
                  setNewStageOrderIndex(Number(event.target.value || 0))
                }
                type="number"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--ops-text-soft)]">
            <label className="inline-flex items-center gap-2">
              <input
                checked={newStageIsClosed}
                className="h-4 w-4 accent-[var(--workspace-primary,var(--ops-primary))]"
                disabled={isSubmitting}
                name="is_closed"
                onChange={(event) => setNewStageIsClosed(event.target.checked)}
                type="checkbox"
              />
              Closed
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                checked={newStageIsWon}
                className="h-4 w-4 accent-[var(--workspace-primary,var(--ops-primary))]"
                disabled={isSubmitting}
                name="is_won"
                onChange={(event) => setNewStageIsWon(event.target.checked)}
                type="checkbox"
              />
              Won
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                checked={newStageIsLost}
                className="h-4 w-4 accent-[var(--workspace-primary,var(--ops-primary))]"
                disabled={isSubmitting}
                name="is_lost"
                onChange={(event) => setNewStageIsLost(event.target.checked)}
                type="checkbox"
              />
              Lost
            </label>
          </div>

          <div className="mt-4 flex justify-end">
            <Button className="gap-2" disabled={isSubmitting} type="submit">
              <PlusIcon aria-hidden="true" size={16} weight="regular" />
              {isSubmitting ? "Adding..." : "Add stage"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
