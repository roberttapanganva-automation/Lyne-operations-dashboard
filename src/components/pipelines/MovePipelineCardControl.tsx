"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { PipelineEntityType } from "@/types/domain";

type StageOption = {
  id: string;
  name: string;
};

type MovePipelineCardControlProps = {
  canMoveCards: boolean;
  currentStageId: string | null;
  entityType: PipelineEntityType;
  recordId: string;
  stageOptions: StageOption[];
};

type MoveResponse = {
  id: string;
  stage_id: string;
};

function getErrorMessage(response: ApiResponse<MoveResponse>) {
  return response.ok ? null : response.error.message;
}

export function MovePipelineCardControl({
  canMoveCards,
  currentStageId,
  entityType,
  recordId,
  stageOptions,
}: MovePipelineCardControlProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  const availableTargets = useMemo(
    () => stageOptions.filter((stage) => stage.id !== currentStageId),
    [currentStageId, stageOptions],
  );
  const [targetStageId, setTargetStageId] = useState(
    availableTargets[0]?.id ?? "",
  );

  if (!canMoveCards || availableTargets.length === 0) {
    return canMoveCards ? null : (
      <p className="text-xs font-medium text-[var(--ops-text-muted)]">
        Read only
      </p>
    );
  }

  async function moveCard() {
    if (!targetStageId) {
      return;
    }

    setError(null);
    setIsMoving(true);

    try {
      const response = await fetch("/api/pipelines/cards/move", {
        body: JSON.stringify({
          entity_type: entityType,
          record_id: recordId,
          target_stage_id: targetStageId,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<MoveResponse>;
      const message = getErrorMessage(result);

      if (!response.ok || message) {
        const nextError = message ?? "We could not move the card.";
        setError(nextError);
        notify.error("Pipeline update failed", nextError);
        return;
      }

      notify.success(
        "Pipeline updated",
        "The lead was moved to the selected stage.",
      );
      router.refresh();
    } catch (caughtError) {
      const nextError =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not move the card.";
      setError(nextError);
      notify.error("Pipeline update failed", nextError);
    } finally {
      setIsMoving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          aria-label="Move card to another stage"
          className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--ops-border)] bg-white px-2.5 text-xs font-medium text-[var(--ops-text)] outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
          disabled={isMoving}
          onChange={(event) => setTargetStageId(event.target.value)}
          value={targetStageId}
        >
          {availableTargets.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </select>
        <Button
          className="h-9 gap-1 px-3 text-xs"
          disabled={isMoving || !targetStageId}
          onClick={moveCard}
          type="button"
        >
          <ArrowRightIcon aria-hidden="true" size={14} weight="bold" />
          {isMoving ? "Moving..." : "Move"}
        </Button>
      </div>
      {error ? (
        <p className="text-xs leading-5 text-[var(--ops-danger)]">{error}</p>
      ) : null}
    </div>
  );
}
