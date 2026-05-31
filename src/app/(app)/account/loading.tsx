import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AccountLoading() {
  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-48" />
                <div className="flex gap-3 pt-2">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-28" />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-36" />
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="space-y-2" key={index}>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
              <div className="flex justify-end">
                <Skeleton className="h-10 w-28" />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card className="p-5 sm:p-6" key={index}>
              <div className="space-y-3">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-4 w-64 max-w-full" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
