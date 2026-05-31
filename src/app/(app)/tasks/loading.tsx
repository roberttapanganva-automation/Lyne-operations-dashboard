import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function TasksLoading() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2 rounded-xl border border-[var(--ops-border)] bg-white p-1 shadow-sm">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton className="h-8 w-24 rounded-lg" key={index} />
          ))}
        </div>
      </section>

      <Card className="overflow-hidden">
        <div className="space-y-0 divide-y divide-[var(--ops-border)]">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              className="grid gap-4 px-5 py-4 xl:grid-cols-[56px_1.5fr_repeat(6,minmax(100px,1fr))]"
              key={index}
            >
              <Skeleton className="h-4 w-4 rounded-sm" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-28" />
              </div>
              {Array.from({ length: 5 }).map((__, cellIndex) => (
                <Skeleton className="h-5 w-24" key={cellIndex} />
              ))}
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
