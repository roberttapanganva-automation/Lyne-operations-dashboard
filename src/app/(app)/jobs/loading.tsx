import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function JobsLoading() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-[var(--ops-border)] px-5 py-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_120px]">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="space-y-0 divide-y divide-[var(--ops-border)]">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              className="grid gap-4 px-5 py-4 xl:grid-cols-[56px_1.4fr_repeat(7,minmax(110px,1fr))]"
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
      </Card>
    </div>
  );
}
