import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AutomationsLoading() {
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="border-b border-[var(--ops-border)] px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        <div className="space-y-0 divide-y divide-[var(--ops-border)]">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="grid gap-3 px-5 py-4 lg:grid-cols-[1.1fr_120px_220px]" key={index}>
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-80 max-w-full" />
              </div>
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-40" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
