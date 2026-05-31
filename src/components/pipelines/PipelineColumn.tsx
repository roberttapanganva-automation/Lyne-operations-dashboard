"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEFAULT_BRAND } from "@/lib/branding/defaults";
import { formatCurrency } from "@/lib/formatting/currency";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { PipelineBoardStage } from "@/types/domain";
import { PipelineCard } from "./PipelineCard";

type MoveResponse = {
  id: string;
  stage_id: string;
};

type DragPayload = {
  entityType: "lead" | "job";
  recordId: string;
  sourceStageId: string | null;
};

type PipelineColumnProps = {
  canMoveCards: boolean;
  currencyCode: string;
  stage: PipelineBoardStage;
};

function hexToRgba(color: string, alpha: number) {
  const normalized = color.trim().replace("#", "");
  const fallbackColor = DEFAULT_BRAND.primaryColor.replace("#", "");

  const source = /^[0-9A-Fa-f]{6}$/.test(normalized)
    ? normalized
    : fallbackColor;

  const red = Number.parseInt(source.slice(0, 2), 16);
  const green = Number.parseInt(source.slice(2, 4), 16);
  const blue = Number.parseInt(source.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function PipelineColumn({
  canMoveCards,
  currencyCode,
  stage,
}: PipelineColumnProps) {
  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);
  const [movingCardId, setMovingCardId] = useState<string | null>(null);

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (!canMoveCards) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOver(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setDragOver(false);
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!canMoveCards) {
      return;
    }

    event.preventDefault();
    setDragOver(false);
    setDropError(null);

    const rawPayload = event.dataTransfer.getData("application/opspilot-pipeline-card");

    if (!rawPayload) {
      return;
    }

    let payload: DragPayload;

    try {
      payload = JSON.parse(rawPayload) as DragPayload;
    } catch {
      const message = "We could not read the dragged card.";
      setDropError(message);
      notify.warning("Card could not be moved", message);
      return;
    }

    if (
      payload.sourceStageId === stage.id ||
      payload.entityType !== stage.entity_type
    ) {
      return;
    }

    setMovingCardId(payload.recordId);

    try {
      const response = await fetch("/api/pipelines/cards/move", {
        body: JSON.stringify({
          entity_type: payload.entityType,
          record_id: payload.recordId,
          target_stage_id: stage.id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<MoveResponse>;

      if (!response.ok || !result.ok) {
        const message = result.ok
          ? "We could not move the card."
          : result.error.message;
        setDropError(message);
        notify.error("Pipeline update failed", message);
        return;
      }

      notify.success(
        "Pipeline updated",
        "The lead was moved to the selected stage.",
      );
      router.refresh();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not move the card.";
      setDropError(message);
      notify.error("Pipeline update failed", message);
    } finally {
      setMovingCardId(null);
    }
  }

  return (
    <section
      className={`flex h-full min-h-[240px] min-w-[220px] max-w-[220px] flex-col rounded-xl transition ${
        dragOver
          ? "shadow-[0_0_0_3px_var(--workspace-primary-glow,var(--ops-primary-glow))]"
          : ""
      }`}
    >
      <div
        className="rounded-lg border border-[var(--ops-border)] px-3 py-2.5 shadow-sm"
        style={{
          backgroundColor: hexToRgba(stage.color, 0.24),
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="line-clamp-2 break-words text-sm font-semibold leading-5 text-[var(--ops-text)]">
              {stage.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--ops-text-soft)]">
              <span>
                {stage.card_count} card{stage.card_count === 1 ? "" : "s"}
              </span>
              <span className="font-semibold text-[var(--ops-text)]">
                {formatCurrency(stage.total_estimated_value, currencyCode)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 rounded-xl transition ${
          dragOver ? "bg-[var(--workspace-primary-soft,var(--ops-primary-soft))]/60 p-1.5" : ""
        }`}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {stage.cards.map((card) => (
          <PipelineCard
            canMoveCards={canMoveCards}
            card={card}
            currencyCode={currencyCode}
            isMoving={movingCardId === card.id}
            key={card.id}
          />
        ))}
        {dropError ? (
          <p className="text-xs leading-5 text-[var(--ops-danger)]">{dropError}</p>
        ) : null}
        {canMoveCards && dragOver ? (
          <p className="rounded-lg border border-dashed border-[var(--workspace-primary,var(--ops-primary))] px-3 py-2 text-center text-xs font-medium text-[var(--workspace-primary,var(--ops-primary-dark))]">
            Drop in {stage.name}
          </p>
        ) : null}
      </div>
    </section>
  );
}
