import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function LeadsLoading() {
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--ops-border)] px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>
        <div className="space-y-4 px-5 py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton className="h-8 w-20 rounded-full" key={index} />
            ))}
          </div>
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_repeat(5,minmax(0,1fr))]">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="overflow-hidden border-t border-[var(--ops-border)]">
          <div className="hidden grid-cols-[56px_1.6fr_repeat(7,minmax(120px,1fr))] gap-4 px-5 py-3 xl:grid">
            {Array.from({ length: 9 }).map((_, index) => (
              <Skeleton className="h-4 w-full" key={index} />
            ))}
          </div>
          <div className="space-y-0 divide-y divide-[var(--ops-border)]">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                className="grid gap-4 px-5 py-4 xl:grid-cols-[56px_1.6fr_repeat(7,minmax(120px,1fr))]"
                key={index}
              >
                <Skeleton className="h-4 w-4 rounded-sm" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                {Array.from({ length: 7 }).map((__, cellIndex) => (
                  <Skeleton className="h-5 w-24" key={cellIndex} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
