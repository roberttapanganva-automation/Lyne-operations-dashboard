"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getAssignableRoles } from "@/lib/permissions/workspace";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { AssignableWorkspaceRole, WorkspaceRole } from "@/types/domain";

type MemberRoleSelectProps = {
  disabled?: boolean;
  memberId: string;
  role: WorkspaceRole;
};

export function MemberRoleSelect({
  disabled = false,
  memberId,
  role,
}: MemberRoleSelectProps) {
  const router = useRouter();
  const [value, setValue] = useState(role);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isDisabled = disabled || role === "owner" || isSaving;

  async function updateRole(nextRole: AssignableWorkspaceRole) {
    setValue(nextRole);
    setMessage(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/owner/members/${memberId}/role`, {
        body: JSON.stringify({ role: nextRole }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<{ id: string }>;

      if (!response.ok || !result.ok) {
        const message = result.ok ? "Role update failed." : result.error.message;
        setMessage(message);
        notify.error("Role could not be updated", message);
        setValue(role);
        return;
      }

      setMessage("Saved");
      notify.success("Changes saved", "Member role updated.");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Role update failed.";
      setMessage(message);
      notify.error("Role could not be updated", message);
      setValue(role);
    } finally {
      setIsSaving(false);
    }
  }

  if (role === "owner") {
    return (
      <span className="text-sm font-semibold text-[var(--ops-text-muted)]">
        Owner locked
      </span>
    );
  }

  return (
    <div className="space-y-1">
      <label className="sr-only" htmlFor={`member-role-${memberId}`}>
        Member role
      </label>
      <select
        className="h-10 rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm font-semibold text-[var(--ops-text)] outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)] disabled:opacity-60"
        disabled={isDisabled}
        id={`member-role-${memberId}`}
        onChange={(event) =>
          updateRole(event.target.value as AssignableWorkspaceRole)
        }
        value={value}
      >
        {getAssignableRoles().map((assignableRole) => (
          <option key={assignableRole} value={assignableRole}>
            {assignableRole}
          </option>
        ))}
      </select>
      {message ? (
        <p className="text-xs text-[var(--ops-text-muted)]">{message}</p>
      ) : null}
    </div>
  );
}
