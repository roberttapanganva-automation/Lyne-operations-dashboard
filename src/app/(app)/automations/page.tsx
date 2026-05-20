import { AutomationsPanel } from "@/components/automations/AutomationsPanel";
import { Card } from "@/components/ui/Card";
import { isN8nConfigured } from "@/lib/n8n/client";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import type { AutomationLog } from "@/types/domain";

function getStatusForWorkspaceResult(status: "no-user" | "no-workspace" | "error") {
  if (status === "no-user") {
    return 401;
  }

  if (status === "no-workspace") {
    return 403;
  }

  return 500;
}

export default async function AutomationsPage() {
  const supabase = await createClient();
  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return (
      <Card className="p-6">
        <p className="text-sm font-semibold text-[var(--ops-text)]">
          Automations unavailable
        </p>
        <p className="mt-2 text-sm text-[var(--ops-text-soft)]">
          {activeWorkspace.error ??
            `Workspace context could not be loaded (${getStatusForWorkspaceResult(
              activeWorkspace.status,
            )}).`}
        </p>
      </Card>
    );
  }

  const { data, error } = await supabase
    .from("automation_logs")
    .select(
      "id,workspace_id,automation_type,related_type,related_id,status,message,payload,error_message,created_at",
    )
    .eq("workspace_id", activeWorkspace.context.workspace.id)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<AutomationLog[]>();

  if (error) {
    return (
      <Card className="p-6">
        <p className="text-sm font-semibold text-[var(--ops-text)]">
          Automation logs could not be loaded
        </p>
        <p className="mt-2 text-sm text-[var(--ops-text-soft)]">
          {error.message}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-[var(--workspace-primary,var(--ops-primary))]">
            Workflow bridge
          </p>
          <h1 className="text-2xl font-semibold text-[var(--ops-text)]">
            Automations
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--ops-text-soft)]">
            Monitor workflow delivery, n8n handoff status, and automation
            reliability for the active workspace.
          </p>
        </div>
      </Card>
      <AutomationsPanel
        isN8nConfigured={isN8nConfigured()}
        logs={data ?? []}
      />
    </div>
  );
}
