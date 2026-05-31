import Link from "next/link";
import { CrownIcon } from "@phosphor-icons/react/ssr";
import { AddLeadToStageDialog } from "@/components/pipelines/AddLeadToStageDialog";
import { PipelineGroupSelect } from "@/components/pipelines/PipelineGroupSelect";
import type { PipelineGroup } from "@/types/domain";

type PipelinePageHeaderProps = {
  canCreateLeadCards: boolean;
  groups: PipelineGroup[];
  selectedGroupEntityType: "lead" | "job" | null;
  selectedGroupCardCount: number;
  selectedGroupId: string | null;
  selectedStageId: string | null;
  selectedStageName: string | null;
  showOwnerLink: boolean;
};

export function PipelinePageHeader({
  canCreateLeadCards,
  groups,
  selectedGroupEntityType,
  selectedGroupCardCount,
  selectedGroupId,
  selectedStageId,
  selectedStageName,
  showOwnerLink,
}: PipelinePageHeaderProps) {
  const showAddOpportunity = Boolean(
    canCreateLeadCards &&
    selectedGroupEntityType === "lead" &&
    selectedStageId &&
    selectedStageName,
  );

  return (
    <section className="p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <PipelineGroupSelect
              groups={groups}
              selectedGroupCardCount={selectedGroupCardCount}
              selectedGroupId={selectedGroupId}
            />
          </div>
          <div className="flex items-center gap-2">
            {showAddOpportunity ? (
              <AddLeadToStageDialog
                buttonLabel="Add opportunity"
                canCreate={canCreateLeadCards}
                stageId={selectedStageId!}
                stageName={selectedStageName!}
              />
            ) : null}
            {showOwnerLink ? (
              <Link
                aria-label="Open Owner Console Pipeline"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--ops-border)] bg-white text-[var(--ops-text)] transition hover:bg-[var(--ops-card-soft)]"
                href="/owner/pipeline"
                title="Owner Console Pipeline"
              >
                <CrownIcon aria-hidden="true" size={18} weight="duotone" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
