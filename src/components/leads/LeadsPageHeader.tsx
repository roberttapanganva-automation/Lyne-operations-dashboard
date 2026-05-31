import {
  DotsThreeOutlineVerticalIcon,
  DownloadSimpleIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr";
import type { LeadPipelineStageOption } from "@/lib/pipelines/queries";
import type { Client } from "@/types/domain";
import { AddLeadDialog } from "./AddLeadDialog";

type LeadsPageHeaderProps = {
  canCreateRecords: boolean;
  clients: Client[];
  leadsCount: number;
  stageOptions: LeadPipelineStageOption[];
};

export function LeadsPageHeader({
  canCreateRecords,
  clients,
  leadsCount,
  stageOptions,
}: LeadsPageHeaderProps) {
  return (
    <section className="rounded-xl border border-[var(--ops-border)] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--ops-primary-soft)] text-[var(--ops-primary-dark)]">
              <UsersThreeIcon aria-hidden="true" size={24} weight="duotone" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--ops-primary-dark)]">
                Lead intake
              </p>
              <h1 className="text-2xl font-semibold tracking-normal text-[var(--ops-text)] sm:text-3xl">
                Leads
              </h1>
            </div>
            <span className="inline-flex items-center rounded-full bg-[var(--ops-card-soft)] px-3 py-1 text-sm font-semibold text-[var(--ops-text-soft)]">
              {leadsCount} {leadsCount === 1 ? "Lead" : "Leads"}
            </span>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--ops-text-soft)]">
            Capture new opportunities, track lead progress, and move prospects through your sales pipeline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-4 text-sm font-semibold text-[var(--ops-text-soft)] opacity-75"
            disabled
            title="Lead import will be added later."
            type="button"
          >
            <DownloadSimpleIcon
              aria-hidden="true"
              className="mr-2"
              size={18}
              weight="regular"
            />
            Import
          </button>
          {canCreateRecords ? (
            <AddLeadDialog clients={clients} stageOptions={stageOptions} />
          ) : null}
          <button
            aria-label="More lead actions"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] text-[var(--ops-text-soft)] opacity-75"
            disabled
            type="button"
          >
            <DotsThreeOutlineVerticalIcon
              aria-hidden="true"
              size={18}
              weight="bold"
            />
          </button>
        </div>
      </div>
    </section>
  );
}
