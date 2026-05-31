"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DEFAULT_BRAND } from "@/lib/branding/defaults";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type {
  AssignableWorkspaceMember,
  AssignmentTargetType,
} from "@/types/domain";
import type { AssignmentRuleWithMembers } from "@/lib/assignments/queries";

type AssignmentRuleSettingsProps = {
  members: AssignableWorkspaceMember[];
  rules: AssignmentRuleWithMembers[];
};

const dueOffsetOptions = [
  { label: "2 hours", value: 120 },
  { label: "Same day", value: 480 },
  { label: "Next day", value: 1440 },
] as const;

function getLeadRule(rules: AssignmentRuleWithMembers[]) {
  return rules.find((rule) => rule.entity_type === "lead");
}

function getErrorMessage(response: ApiResponse<{ rules: AssignmentRuleWithMembers[] }>) {
  return response.ok ? null : response.error.message;
}

export function AssignmentRuleSettings({
  members,
  rules,
}: AssignmentRuleSettingsProps) {
  const leadRule = getLeadRule(rules);
  const [enabled, setEnabled] = useState(leadRule?.enabled ?? false);
  const [autoCreateTask, setAutoCreateTask] = useState(
    leadRule?.auto_create_task ?? false,
  );
  const [notifyAssignee, setNotifyAssignee] = useState(
    leadRule?.notify_assignee ?? true,
  );
  const [taskDueOffsetMinutes, setTaskDueOffsetMinutes] = useState(
    leadRule?.task_due_offset_minutes ?? 1440,
  );
  const [memberIds, setMemberIds] = useState<string[]>(
    leadRule?.members
      .filter((member) => member.active)
      .sort((left, right) => left.order_index - right.order_index)
      .map((member) => member.workspace_member_id) ?? [],
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const selectedMemberSet = useMemo(() => new Set(memberIds), [memberIds]);

  function toggleMember(memberId: string) {
    setMemberIds((current) =>
      current.includes(memberId)
        ? current.filter((id) => id !== memberId)
        : [...current, memberId],
    );
  }

  async function saveRule() {
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/assignments/rules", {
        body: JSON.stringify({
          auto_create_task: autoCreateTask,
          enabled,
          entity_type: "lead" satisfies AssignmentTargetType,
          member_ids: memberIds,
          notify_assignee: notifyAssignee,
          task_due_offset_minutes: taskDueOffsetMinutes,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result =
        (await response.json()) as ApiResponse<{ rules: AssignmentRuleWithMembers[] }>;
      const message = getErrorMessage(result);

      if (!response.ok || !result.ok) {
        const errorMessage = message ?? "Assignment rule could not be saved.";
        setError(errorMessage);
        notify.error("Assignment rule failed", errorMessage);
        return;
      }

      setSuccess("Lead assignment rule saved.");
      notify.success("Assignment rule saved", "Round-robin settings were updated.");
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "Assignment rule could not be saved.";
      setError(errorMessage);
      notify.error("Assignment rule failed", errorMessage);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-[var(--workspace-primary,var(--ops-primary-dark))]">
            Assignment Foundation
          </p>
          <h1 className="text-2xl font-semibold text-[var(--ops-text)]">
            Round-robin assignment
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--ops-text-soft)]">
            Configure how new leads are assigned to active team members. Jobs and
            tasks support manual assignment now; automated rules can be expanded
            later without changing the assignment model.
          </p>
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold text-[var(--ops-text)]">
            Lead Auto-assignment
          </h2>
          <p className="text-sm text-[var(--ops-text-soft)]">
            Round robin rotates across the selected assignment pool.
          </p>
        </div>

        {error ? (
          <p
            className="mt-5 rounded-lg bg-[var(--ops-danger-soft)] p-3 text-sm text-[var(--ops-danger)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-5 rounded-lg bg-[var(--ops-success-soft)] p-3 text-sm text-[var(--ops-success)]">
            {success}
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="flex items-center justify-between gap-4 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
            <span>
              <span className="block text-sm font-semibold text-[var(--ops-text)]">
                Enable auto-assignment for leads
              </span>
              <span className="mt-1 block text-sm text-[var(--ops-text-soft)]">
                New leads created in {DEFAULT_BRAND.appName} will be assigned automatically.
              </span>
            </span>
            <input
              checked={enabled}
              className="h-5 w-5 accent-[var(--workspace-primary,var(--ops-primary))]"
              onChange={(event) => setEnabled(event.target.checked)}
              type="checkbox"
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
            <span>
              <span className="block text-sm font-semibold text-[var(--ops-text)]">
                Notify assignee through n8n
              </span>
              <span className="mt-1 block text-sm text-[var(--ops-text-soft)]">
                Assignment still saves if n8n is unavailable.
              </span>
            </span>
            <input
              checked={notifyAssignee}
              className="h-5 w-5 accent-[var(--workspace-primary,var(--ops-primary))]"
              onChange={(event) => setNotifyAssignee(event.target.checked)}
              type="checkbox"
            />
          </label>
        </div>

        <div className="mt-5">
          <p className="text-sm font-semibold text-[var(--ops-text)]">
            Assignment pool
          </p>
          {members.length === 0 ? (
            <p className="mt-2 rounded-lg border border-dashed border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4 text-sm text-[var(--ops-text-soft)]">
              No active admin, manager, or staff members are available.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {members.map((member) => (
                <label
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ops-border)] bg-white p-3"
                  key={member.id}
                >
                  <span>
                    <span className="block text-sm font-semibold text-[var(--ops-text)]">
                      {member.display_name}
                    </span>
                    <span className="mt-1 block text-xs uppercase tracking-[0.14em] text-[var(--ops-text-muted)]">
                      {member.role}
                    </span>
                  </span>
                  <input
                    checked={selectedMemberSet.has(member.id)}
                    className="h-5 w-5 accent-[var(--workspace-primary,var(--ops-primary))]"
                    onChange={() => toggleMember(member.id)}
                    type="checkbox"
                  />
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="flex items-center justify-between gap-4 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
            <span>
              <span className="block text-sm font-semibold text-[var(--ops-text)]">
                Auto-create follow-up task
              </span>
              <span className="mt-1 block text-sm text-[var(--ops-text-soft)]">
                Creates a task for the same assignee after lead assignment.
              </span>
            </span>
            <input
              checked={autoCreateTask}
              className="h-5 w-5 accent-[var(--workspace-primary,var(--ops-primary))]"
              onChange={(event) => setAutoCreateTask(event.target.checked)}
              type="checkbox"
            />
          </label>

          <div>
            <label
              className="text-sm font-semibold text-[var(--ops-text)]"
              htmlFor="assignment-task-offset"
            >
              Follow-up task due
            </label>
            <select
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
              id="assignment-task-offset"
              onChange={(event) => setTaskDueOffsetMinutes(Number(event.target.value))}
              value={taskDueOffsetMinutes}
            >
              {dueOffsetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button disabled={isSaving} onClick={saveRule}>
            {isSaving ? "Saving..." : "Save assignment rule"}
          </Button>
        </div>
      </Card>

      <section className="grid gap-4 lg:grid-cols-2">
        {(["job", "task"] as const).map((entityType) => (
          <Card className="p-5 sm:p-6" key={entityType}>
            <h2 className="text-base font-semibold capitalize text-[var(--ops-text)]">
              {entityType} automation
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--ops-text-soft)]">
              Manual assignment is available now. Automated {entityType} rules
              are intentionally deferred until the lead workflow is validated.
            </p>
          </Card>
        ))}
      </section>
    </div>
  );
}
