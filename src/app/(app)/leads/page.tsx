import { getClientsForActiveWorkspace } from "@/lib/clients/queries";
import { getLeadsForActiveWorkspace } from "@/lib/leads/queries";
import { getLeadPipelineStageOptionsForActiveWorkspace } from "@/lib/pipelines/queries";
import { getEffectiveRolePermission } from "@/lib/permissions/effective";
import {
  canCreateOperationalRecords,
  canDeleteOperationalRecords,
} from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { ContactsPanel } from "@/components/leads/ContactsPanel";
import { LeadsList } from "@/components/leads/LeadsList";

type LeadsPageProps = {
  searchParams?: Promise<{
    tab?: string | string[];
  }>;
};

export default async function LeadsPage({ searchParams }: LeadsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const tabParam = Array.isArray(resolvedSearchParams.tab)
    ? resolvedSearchParams.tab[0]
    : resolvedSearchParams.tab;
  const activeTab = tabParam === "contacts" ? "contacts" : "leads";
  const activeWorkspace = await getActiveWorkspace();
  const supabase = await createClient();
  const [leads, clients, stageOptions] = await Promise.all([
    getLeadsForActiveWorkspace(),
    getClientsForActiveWorkspace(),
    getLeadPipelineStageOptionsForActiveWorkspace(),
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
    rolePermission?.can_create_leads !== false;
  const canDeleteRecords =
    activeWorkspace.status === "ready" &&
    canDeleteOperationalRecords(activeWorkspace.context.role);

  return (
    <div className="space-y-5 sm:space-y-6">
      {activeTab === "leads" ? (
        <>
          <LeadsList
            activeTab={activeTab}
            canCreateRecords={canCreateRecords}
            canDeleteRecords={canDeleteRecords}
            clients={clients}
            leads={leads}
            stageOptions={stageOptions}
          />
        </>
      ) : (
        <ContactsPanel
          activeTab={activeTab}
          canCreateRecords={canCreateRecords}
          canDeleteRecords={canDeleteRecords}
          clients={clients}
        />
      )}
    </div>
  );
}
