import { AddAppointmentDialog } from "./AddAppointmentDialog";

type CalendarPageHeaderProps = {
  canCreateRecords: boolean;
};

export function CalendarPageHeader({
  canCreateRecords,
}: CalendarPageHeaderProps) {
  return (
    <div className="flex justify-end">
      {canCreateRecords ? (
        <AddAppointmentDialog className="h-9 w-full shrink-0 sm:w-auto" />
      ) : null}
    </div>
  );
}
