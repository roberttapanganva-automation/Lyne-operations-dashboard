import { AddJobDialog } from "./AddJobDialog";

type JobsPageHeaderProps = {
  canCreateRecords: boolean;
};

export function JobsPageHeader({ canCreateRecords }: JobsPageHeaderProps) {
  return (
    <section className="flex justify-end">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
        {canCreateRecords ? <AddJobDialog /> : null}
      </div>
    </section>
  );
}
