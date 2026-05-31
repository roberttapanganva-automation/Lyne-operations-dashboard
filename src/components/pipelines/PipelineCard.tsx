"use client";

import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/formatting/currency";
import { formatDateTime } from "@/lib/formatting/date";
import type { PipelineBoardCard } from "@/types/domain";
import { EditPipelineLeadDialog } from "./EditPipelineLeadDialog";

type PipelineCardProps = {
  canMoveCards: boolean;
  card: PipelineBoardCard;
  currencyCode: string;
  isMoving?: boolean;
};

function getStatusBadgeVariant(status: string) {
  if (status === "won" || status === "completed" || status === "paid") {
    return "success" as const;
  }

  if (status === "lost" || status === "cancelled" || status === "refunded") {
    return "danger" as const;
  }

  if (
    status === "scheduled" ||
    status === "in_progress" ||
    status === "partial"
  ) {
    return "info" as const;
  }

  if (status === "urgent") {
    return "warning" as const;
  }

  return "default" as const;
}

function getPriorityLabel(priority: PipelineBoardCard["priority"]) {
  if (!priority) {
    return null;
  }

  return priority.replace("_", " ");
}

export function PipelineCard({
  canMoveCards,
  card,
  currencyCode,
  isMoving = false,
}: PipelineCardProps) {
  const secondaryDetails =
    card.entity_type === "lead"
      ? [card.client?.name ?? card.client?.email, card.next_follow_up_at ? formatDateTime(card.next_follow_up_at) : null]
      : [card.service_type, card.scheduled_start ? formatDateTime(card.scheduled_start) : null, card.location];

  const cardBody = (
    <article
      className={`rounded-lg border border-[var(--ops-border)] bg-white/90 px-3 py-2 shadow-sm transition hover:border-[var(--workspace-primary,var(--ops-primary))] ${
        canMoveCards ? "cursor-grab active:cursor-grabbing" : ""
      } ${isMoving ? "opacity-60" : ""}`}
      draggable={canMoveCards}
      onDragStart={(event) => {
        if (!canMoveCards) {
          return;
        }

        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(
          "application/opspilot-pipeline-card",
          JSON.stringify({
            entityType: card.entity_type,
            recordId: card.id,
            sourceStageId: card.stage_id,
          }),
        );
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--ops-text)]">
            {card.title}
          </p>
          {card.client?.name || card.client?.email ? (
            <p className="mt-0.5 truncate text-xs text-[var(--ops-text-soft)]">
              {card.client?.name ?? card.client?.email}
              {card.client?.name && card.client?.email
                ? ` - ${card.client?.email}`
                : null}
            </p>
          ) : null}
        </div>
        <Badge variant={getStatusBadgeVariant(card.status)}>
          {card.status.replace("_", " ")}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {typeof card.estimated_value === "number" ? (
          <Badge variant="default">
            {formatCurrency(card.estimated_value, currencyCode)}
          </Badge>
        ) : null}
        {card.priority ? (
          <Badge variant={card.priority === "urgent" ? "warning" : "info"}>
            {getPriorityLabel(card.priority)}
          </Badge>
        ) : null}
        {card.payment_status ? (
          <Badge variant={getStatusBadgeVariant(card.payment_status)}>
            {card.payment_status.replace("_", " ")}
          </Badge>
        ) : null}
      </div>

      {secondaryDetails.some(Boolean) ? (
        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs leading-5 text-[var(--ops-text-soft)]">
          {secondaryDetails.filter(Boolean).map((detail) => (
            <span key={detail} className="truncate">
              {detail}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );

  if (card.entity_type === "lead") {
    return (
      <EditPipelineLeadDialog
        lead={card}
        trigger={cardBody}
      />
    );
  }

  return cardBody;
}
