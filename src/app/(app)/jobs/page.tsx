import { JobsWorkspace } from "@/components/jobs/JobsWorkspace";
import { getCurrentWorkspaceMemberId } from "@/lib/assignments/queries";
import { getJobsForActiveWorkspace } from "@/lib/jobs/queries";
import { getEffectiveRolePermission } from "@/lib/permissions/effective";
import {
  canAssignOperationalRecords,
  canCreateOperationalRecords,
  canDeleteOperationalRecords,
} from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";

export default async function JobsPage() {
  const activeWorkspace = await getActiveWorkspace();
  const supabase = await createClient();
  const [jobs, currentMemberId] = await Promise.all([
    getJobsForActiveWorkspace(),
    getCurrentWorkspaceMemberId(),
  ]);
  const rolePermission =
    activeWorkspace.status === "ready"
      ? await getEffectiveRolePermission({
          role: activeWorkspace.context.role,
          supabase,
          workspaceId: activeWorkspace.context.workspace.id,
        })
      : null;
  const canCreateRecords =
    activeWorkspace.status === "ready" &&
    canCreateOperationalRecords(activeWorkspace.context.role) &&
    rolePermission?.can_create_jobs !== false;
  const canDeleteRecords =
    activeWorkspace.status === "ready" &&
    canDeleteOperationalRecords(activeWorkspace.context.role);
  const canAssignRecords =
    activeWorkspace.status === "ready" &&
    canAssignOperationalRecords(activeWorkspace.context.role);

  return (
    <JobsWorkspace
      canAssignRecords={canAssignRecords}
      canCreateRecords={canCreateRecords}
      canDeleteRecords={canDeleteRecords}
      currentMemberId={currentMemberId}
      jobs={jobs}
    />
  );
}
