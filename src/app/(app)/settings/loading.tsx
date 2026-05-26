import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </Card>

      <section className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card className="p-5 sm:p-6" key={index}>
            <div className="space-y-4">
              <Skeleton className="h-6 w-40" />
              {Array.from({ length: 4 }).map((__, fieldIndex) => (
                <div className="space-y-2" key={fieldIndex}>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </section>

      <Card className="p-5 sm:p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-4 w-[34rem] max-w-full" />
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton className="h-12 w-full" key={index} />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
