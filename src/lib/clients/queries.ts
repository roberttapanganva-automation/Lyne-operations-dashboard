import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import type { Client, ClientListItem } from "@/types/domain";

type CompletedJobRow = {
  client_id: string | null;
  created_at: string;
  scheduled_end: string | null;
  scheduled_start: string | null;
};

type LinkedLeadRow = {
  client_id: string | null;
  created_at: string;
};

function getLatestCompletedJobAt(job: CompletedJobRow) {
  return job.scheduled_end ?? job.scheduled_start ?? job.created_at;
}

function toClientListItem(
  client: Client,
  completedJobs: CompletedJobRow[],
  linkedLeads: LinkedLeadRow[],
): ClientListItem {
  const completedJobCount = completedJobs.length;
  const latestCompletedJobAt =
    completedJobs.length > 0
      ? completedJobs
          .map(getLatestCompletedJobAt)
          .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null
      : null;
  const linkedLeadCount = linkedLeads.length;
  const latestLeadActivityAt =
    linkedLeads.length > 0
      ? linkedLeads
          .map((lead) => lead.created_at)
          .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null
      : null;

  return {
    ...client,
    completed_job_count: completedJobCount,
    last_activity_at: latestCompletedJobAt ?? latestLeadActivityAt,
    latest_lead_activity_at: latestLeadActivityAt,
    latest_completed_job_at: latestCompletedJobAt,
    linked_lead_count: linkedLeadCount,
    relationship_label:
      completedJobCount > 1
        ? "Repeat customer"
        : completedJobCount === 1
          ? "Customer"
          : "Saved contact",
  };
}

export async function getClientsForActiveWorkspace(): Promise<ClientListItem[]> {
  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id,workspace_id,name,email,phone,company_name,address,notes,source,created_by,updated_by,created_at,updated_at",
    )
    .eq("workspace_id", activeWorkspace.context.workspace.id)
    .order("created_at", { ascending: false })
    .returns<Client[]>();

  if (error) {
    throw new Error(error.message);
  }

  const clients = data ?? [];

  if (clients.length === 0) {
    return [];
  }

  const { data: completedJobs, error: completedJobsError } = await supabase
    .from("jobs")
    .select("client_id,created_at,scheduled_start,scheduled_end")
    .eq("workspace_id", activeWorkspace.context.workspace.id)
    .eq("status", "completed")
    .not("client_id", "is", null)
    .returns<CompletedJobRow[]>();

  if (completedJobsError) {
    throw new Error(completedJobsError.message);
  }

  const jobsByClientId = new Map<string, CompletedJobRow[]>();

  for (const job of completedJobs ?? []) {
    if (!job.client_id) {
      continue;
    }

    const bucket = jobsByClientId.get(job.client_id) ?? [];
    bucket.push(job);
    jobsByClientId.set(job.client_id, bucket);
  }

  const { data: linkedLeads, error: linkedLeadsError } = await supabase
    .from("leads")
    .select("client_id,created_at")
    .eq("workspace_id", activeWorkspace.context.workspace.id)
    .not("client_id", "is", null)
    .returns<LinkedLeadRow[]>();

  if (linkedLeadsError) {
    throw new Error(linkedLeadsError.message);
  }

  const leadsByClientId = new Map<string, LinkedLeadRow[]>();

  for (const lead of linkedLeads ?? []) {
    if (!lead.client_id) {
      continue;
    }

    const bucket = leadsByClientId.get(lead.client_id) ?? [];
    bucket.push(lead);
    leadsByClientId.set(lead.client_id, bucket);
  }

  return clients
    .map((client) =>
      toClientListItem(
        client,
        jobsByClientId.get(client.id) ?? [],
        leadsByClientId.get(client.id) ?? [],
      ),
    )
    .sort((left, right) => {
      if (right.completed_job_count !== left.completed_job_count) {
        return right.completed_job_count - left.completed_job_count;
      }

      return (
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
      );
    });
}
