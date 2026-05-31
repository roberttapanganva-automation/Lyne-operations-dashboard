import { createClient } from "@/lib/supabase/server";
import { getAssignmentDisplayMapForWorkspace } from "@/lib/assignments/queries";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import type { AssignableWorkspaceMember, ClientSummary } from "@/types/domain";
import type { LeadListItem } from "@/components/leads/LeadsList";

type LeadRow = {
  assigned_member_id: string | null;
  client_id: string | null;
  clients: ClientSummary | null;
  created_at: string;
  estimated_value: number | string;
  id: string;
  next_follow_up_at: string | null;
  priority: LeadListItem["priority"];
  source: string | null;
  stage_id: string | null;
  status: LeadListItem["status"];
  title: string;
};

function isMissingAssignmentColumnError(error: { message?: string } | null) {
  return Boolean(
    error?.message?.includes("assigned_member_id") &&
      error.message.includes("does not exist"),
  );
}

function normalizeLead(
  row: LeadRow,
  assignmentsByMemberId: Map<string, AssignableWorkspaceMember>,
): LeadListItem {
  return {
    assigned_member: row.assigned_member_id
      ? assignmentsByMemberId.get(row.assigned_member_id) ?? null
      : null,
    assigned_member_id: row.assigned_member_id,
    client: row.clients,
    client_id: row.client_id,
    created_at: row.created_at,
    estimated_value:
      typeof row.estimated_value === "number"
        ? row.estimated_value
        : Number(row.estimated_value),
    id: row.id,
    next_follow_up_at: row.next_follow_up_at,
    priority: row.priority,
    source: row.source,
    stage_id: row.stage_id,
    status: row.status,
    title: row.title,
  };
}

export async function getLeadsForActiveWorkspace(): Promise<LeadListItem[]> {
  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return [];
  }

  const supabase = await createClient();
  const workspaceId = activeWorkspace.context.workspace.id;
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id,assigned_member_id,client_id,title,source,estimated_value,priority,status,stage_id,next_follow_up_at,created_at,clients(id,name,email,phone,company_name,source)",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .returns<LeadRow[]>();

  if (error) {
    if (isMissingAssignmentColumnError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("leads")
        .select(
          "id,client_id,title,source,estimated_value,priority,status,stage_id,next_follow_up_at,created_at,clients(id,name,email,phone,company_name,source)",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .returns<Omit<LeadRow, "assigned_member_id">[]>();

      if (fallbackError) {
        throw new Error(fallbackError.message);
      }

      return (fallbackData ?? []).map((lead) =>
        normalizeLead(
          {
            ...lead,
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
      .map((lead) => lead.assigned_member_id)
      .filter((memberId): memberId is string => Boolean(memberId)),
    supabase,
    workspaceId,
  });

  return (data ?? []).map((lead) => normalizeLead(lead, assignmentsByMemberId));
}
