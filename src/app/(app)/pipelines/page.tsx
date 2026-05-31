import { PipelineBoard } from "@/components/pipelines/PipelineBoard";
import { PipelinePageHeader } from "@/components/pipelines/PipelinePageHeader";
import { Card } from "@/components/ui/Card";
import { canAccessOwnerConsole } from "@/lib/permissions/workspace";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { getPipelineBoardForActiveWorkspace } from "@/lib/pipelines/queries";

type PipelinesPageProps = {
  searchParams: Promise<{
    pipeline?: string;
  }>;
};

export default async function PipelinesPage({
  searchParams,
}: PipelinesPageProps) {
  const params = await searchParams;
  const [activeWorkspace, board] = await Promise.all([
    getActiveWorkspace(),
    getPipelineBoardForActiveWorkspace(params.pipeline),
  ]);

  if (activeWorkspace.status !== "ready") {
    return (
      <Card className="p-6">
        <h1 className="text-lg font-semibold text-[var(--ops-text)]">
          Pipelines unavailable
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--ops-text-soft)]">
          We could not load the active workspace pipeline board.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <PipelinePageHeader
        canCreateLeadCards={board.can_create_leads}
        groups={board.groups}
        selectedGroupEntityType={board.selected_group?.entity_type ?? null}
        selectedGroupCardCount={board.stages.reduce(
          (total, stage) => total + stage.card_count,
          0,
        )}
        selectedGroupId={board.selected_group?.id ?? null}
        selectedStageId={board.stages[0]?.id ?? null}
        selectedStageName={board.stages[0]?.name ?? null}
        showOwnerLink={canAccessOwnerConsole(activeWorkspace.context.role)}
      />
      <PipelineBoard
        board={board}
        currencyCode={activeWorkspace.context.workspace.currency_code ?? "USD"}
        showOwnerLink={canAccessOwnerConsole(activeWorkspace.context.role)}
      />
    </div>
  );
}
