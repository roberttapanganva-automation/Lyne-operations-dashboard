"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PipelineGroup } from "@/types/domain";

type PipelineGroupSelectProps = {
  groups: PipelineGroup[];
  selectedGroupCardCount: number;
  selectedGroupId: string | null;
};

export function PipelineGroupSelect({
  groups,
  selectedGroupCardCount,
  selectedGroupId,
}: PipelineGroupSelectProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--ops-border-strong)] bg-[var(--ops-card-soft)] px-3 py-2 text-sm text-[var(--ops-text-soft)]">
        No pipelines configured yet
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label
        className="sr-only"
        htmlFor="pipeline-group-select"
      >
        Pipeline
      </label>
      <select
        className="h-10 min-w-[240px] rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm font-medium text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--workspace-primary,var(--ops-primary))] focus:ring-2 focus:ring-[var(--workspace-primary-glow,var(--ops-primary-glow))]"
        id="pipeline-group-select"
        onChange={(event) => {
          const next = new URLSearchParams(searchParams.toString());

          if (event.target.value) {
            next.set("pipeline", event.target.value);
          } else {
            next.delete("pipeline");
          }

          const queryString = next.toString();
          router.push(queryString ? `${pathname}?${queryString}` : pathname);
        }}
        value={selectedGroupId ?? ""}
      >
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </select>
      <span className="inline-flex h-8 items-center rounded-full bg-[var(--workspace-primary-soft,var(--ops-primary-soft))] px-3 text-xs font-semibold text-[var(--workspace-primary,var(--ops-primary-dark))]">
        {selectedGroupCardCount} {selectedGroupCardCount === 1 ? "opportunity" : "opportunities"}
      </span>
    </div>
  );
}
