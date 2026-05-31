"use client";

import { useEffect, useState } from "react";
import type { ApiResponse } from "@/types/api";
import type { AssignableWorkspaceMember } from "@/types/domain";

type AssignmentMemberFieldProps = {
  assignedMember?: AssignableWorkspaceMember | null;
  canAssign: boolean;
  defaultValue?: string | null;
  disabled?: boolean;
  id: string;
  label?: string;
  name?: string;
};

function formatRole(role: AssignableWorkspaceMember["role"]) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function formatMemberOption(member: AssignableWorkspaceMember) {
  return `${member.display_name} - ${formatRole(member.role)}`;
}

export function AssignmentMemberField({
  assignedMember = null,
  canAssign,
  defaultValue = null,
  disabled = false,
  id,
  label = "Assigned to",
  name = "assigned_member_id",
}: AssignmentMemberFieldProps) {
  const [members, setMembers] = useState<AssignableWorkspaceMember[]>([]);
  const [isLoading, setIsLoading] = useState(canAssign);
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

  if (!canAssign) {
    return (
      <div>
        <p className="text-sm font-medium text-[var(--ops-text)]">{label}</p>
        <div className="mt-2 flex min-h-10 items-center rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-3 text-sm text-[var(--ops-text-soft)]">
          {assignedMember?.display_name ?? "Unassigned"}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="text-sm font-medium text-[var(--ops-text)]" htmlFor={id}>
        {label}
      </label>
      <select
        className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))] disabled:cursor-not-allowed disabled:opacity-60"
        defaultValue={defaultValue ?? ""}
        disabled={disabled || isLoading}
        id={id}
        name={name}
      >
        <option value="">Unassigned</option>
        {members.map((member) => (
          <option key={member.id} value={member.id}>
            {formatMemberOption(member)}
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
