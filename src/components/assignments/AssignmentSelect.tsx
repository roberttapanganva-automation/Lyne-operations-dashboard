"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type {
  AssignableWorkspaceMember,
  AssignmentResult,
  AssignmentTargetType,
} from "@/types/domain";

type AssignmentSelectProps = {
  assignedMember: AssignableWorkspaceMember | null;
  assignedMemberId: string | null;
  canAssign: boolean;
  recordId: string;
  targetType: AssignmentTargetType;
};

function getAssignEndpoint(targetType: AssignmentTargetType, recordId: string) {
  if (targetType === "lead") {
    return `/api/leads/${recordId}/assign`;
  }

  if (targetType === "job") {
    return `/api/jobs/${recordId}/assign`;
  }

  return `/api/tasks/${recordId}/assign`;
}

function getErrorMessage(response: ApiResponse<AssignmentResult>) {
  return response.ok ? null : response.error.message;
}

export function AssignmentSelect({
  assignedMember,
  assignedMemberId,
  canAssign,
  recordId,
  targetType,
}: AssignmentSelectProps) {
  const router = useRouter();
  const [members, setMembers] = useState<AssignableWorkspaceMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState(
    assignedMemberId ?? "",
  );
  const [isLoading, setIsLoading] = useState(canAssign);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canAssign) {
      return;
    }

    let isActive = true;

    fetch("/api/assignments/members")
      .then(async (response) => {
        const result =
          (await response.json()) as ApiResponse<AssignableWorkspaceMember[]>;

        if (!response.ok || !result.ok) {
          throw new Error(
            result.ok ? "Could not load members." : result.error.message,
          );
        }

        if (isActive) {
          setMembers(result.data);
        }
      })
      .catch((caughtError) => {
        if (isActive) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load members.",
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [canAssign]);

  async function handleAssign(nextMemberId: string) {
    setSelectedMemberId(nextMemberId);
    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(getAssignEndpoint(targetType, recordId), {
        body: JSON.stringify({
          assigned_member_id: nextMemberId || null,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<AssignmentResult>;
      const message = getErrorMessage(result);

      if (!response.ok || !result.ok) {
        const errorMessage = message ?? "Assignment could not be saved.";
        setError(errorMessage);
        setSelectedMemberId(assignedMemberId ?? "");
        notify.error("Assignment failed", errorMessage);
        return;
      }

      notify.success("Assignment saved", "Work assignment was updated.");
      router.refresh();
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "Assignment could not be saved.";
      setError(errorMessage);
      setSelectedMemberId(assignedMemberId ?? "");
      notify.error("Assignment failed", errorMessage);
    } finally {
      setIsSaving(false);
    }
  }

  if (!canAssign) {
    return (
      <span className="inline-flex rounded-full bg-[var(--ops-card-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--ops-text-soft)]">
        {assignedMember?.display_name ?? "Unassigned"}
      </span>
    );
  }

  return (
    <div className="min-w-[10rem]">
      <label className="sr-only" htmlFor={`${targetType}-${recordId}-assignment`}>
        Assign {targetType}
      </label>
      <select
        className="h-9 w-full rounded-lg border border-[var(--ops-border)] bg-white px-2.5 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isLoading || isSaving}
        id={`${targetType}-${recordId}-assignment`}
        onChange={(event) => handleAssign(event.target.value)}
        value={selectedMemberId}
      >
        <option value="">Unassigned</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {member.display_name}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1 text-xs text-[var(--ops-danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
