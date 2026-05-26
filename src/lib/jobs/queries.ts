import { createClient } from "@/lib/supabase/server";
import { getAssignmentDisplayMapForWorkspace } from "@/lib/assignments/queries";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import type { AssignableWorkspaceMember } from "@/types/domain";
import type { JobListItem } from "@/components/jobs/JobsList";

type JobRow = {
  assigned_member_id: string | null;
  client_id: string | null;
  clients: {
    email: string | null;
    name: string;
  } | null;
  created_at: string;
  estimated_value: number | string;
  id: string;
  location: string | null;
  payment_status: JobListItem["payment_status"];
  scheduled_end: string | null;
  scheduled_start: string | null;
  service_type: string | null;
  status: JobListItem["status"];
  title: string;
};

function isMissingAssignmentColumnError(error: { message?: string } | null) {
  return Boolean(
    error?.message?.includes("assigned_member_id") &&
      error.message.includes("does not exist"),
  );
}

function normalizeJob(
  row: JobRow,
  assignmentsByMemberId: Map<string, AssignableWorkspaceMember>,
): JobListItem {
  return {
    assigned_member: row.assigned_member_id
      ? assignmentsByMemberId.get(row.assigned_member_id) ?? null
      : null,
    assigned_member_id: row.assigned_member_id,
    client: row.clients
      ? {
          email: row.clients.email,
          name: row.clients.name,
        }
      : null,
    client_id: row.client_id,
    created_at: row.created_at,
    estimated_value:
      typeof row.estimated_value === "number"
        ? row.estimated_value
        : Number(row.estimated_value),
    id: row.id,
    location: row.location,
    payment_status: row.payment_status,
    scheduled_end: row.scheduled_end,
    scheduled_start: row.scheduled_start,
    service_type: row.service_type,
    status: row.status,
    title: row.title,
  };
}

export async function getJobsForActiveWorkspace(): Promise<JobListItem[]> {
  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return [];
  }

  const supabase = await createClient();
  const workspaceId = activeWorkspace.context.workspace.id;
  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id,assigned_member_id,client_id,title,service_type,scheduled_start,scheduled_end,location,estimated_value,payment_status,status,created_at,clients(name,email)",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .returns<JobRow[]>();

  if (error) {
    if (isMissingAssignmentColumnError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("jobs")
        .select(
          "id,client_id,title,service_type,scheduled_start,scheduled_end,location,estimated_value,payment_status,status,created_at,clients(name,email)",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .returns<Omit<JobRow, "assigned_member_id">[]>();

      if (fallbackError) {
        throw new Error(fallbackError.message);
      }

      return (fallbackData ?? []).map((job) =>
        normalizeJob(
          {
            ...job,
            assigned_member_id: null,
          },
          new Map(),
        ),
      );
    }

    throw new Error(error.message);
  }

  const assignmentsByMemberId = await getAssignmentDisplayMapForWorkspace({
    memberIds: (data ?? [])
      .map((job) => job.assigned_member_id)
      .filter((memberId): memberId is string => Boolean(memberId)),
    supabase,
    workspaceId,
  });

  return (data ?? []).map((job) => normalizeJob(job, assignmentsByMemberId));
}
