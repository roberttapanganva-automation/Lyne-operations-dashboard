import { FunnelSimpleIcon, UsersThreeIcon } from "@phosphor-icons/react/ssr";
import { Card } from "@/components/ui/Card";
import type { LeadPipelineStageOption } from "@/lib/pipelines/queries";
import type { Client } from "@/types/domain";
import { AddLeadDialog } from "./AddLeadDialog";
import type { LeadListItem } from "./LeadsList";

type LeadsEmptyStateProps = {
  canAssignRecords: boolean;
  canCreateRecords: boolean;
  clients: Client[];
  onLeadCreated?: (lead: LeadListItem) => void;
  stageOptions: LeadPipelineStageOption[];
};

export function LeadsEmptyState({
  canAssignRecords,
  canCreateRecords,
  clients,
  onLeadCreated,
  stageOptions,
}: LeadsEmptyStateProps) {
  return (
    <Card className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ops-primary-soft)] text-[var(--ops-primary-dark)]">
            <UsersThreeIcon aria-hidden="true" size={24} weight="duotone" />
          </div>
          <h2 className="mt-5 text-xl font-semibold tracking-normal text-[var(--ops-text)]">
            No leads yet. Add your first lead to start tracking new opportunities.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ops-text-soft)]">
            Leads created from forms, manual entry, or future automations will
            appear here.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            {canCreateRecords ? (
              <AddLeadDialog
                canAssignRecords={canAssignRecords}
                clients={clients}
                onLeadCreated={onLeadCreated}
                stageOptions={stageOptions}
              />
            ) : null}
            <p className="text-sm text-[var(--ops-text-muted)]">
              {canCreateRecords
                ? "The lead will be saved to your active workspace."
                : "You have read-only access for this workspace."}
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-6 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ops-text)]">
            <FunnelSimpleIcon aria-hidden="true" size={20} weight="duotone" />
            Future lead intake
          </div>
          <div className="mt-5 space-y-3" aria-hidden="true">
            <div className="rounded-lg border border-dashed border-[var(--ops-border-strong)] bg-white p-4">
              <div className="h-3 w-4/5 rounded-full bg-[var(--ops-border)]" />
              <div className="mt-3 h-3 w-2/5 rounded-full bg-[var(--ops-border)]" />
            </div>
            <div className="rounded-lg border border-dashed border-[var(--ops-border-strong)] bg-white p-4">
              <div className="h-3 w-3/5 rounded-full bg-[var(--ops-border)]" />
              <div className="mt-3 h-3 w-1/2 rounded-full bg-[var(--ops-border)]" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
