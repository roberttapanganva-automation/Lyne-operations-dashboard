import { Badge } from "@/components/ui/Badge";

export type TaskStatus = "todo" | "in_progress" | "done" | "cancelled";

type TaskStatusBadgeProps = {
  isOverdue?: boolean;
  status: TaskStatus;
};

const statusConfig: Record<
  TaskStatus,
  {
    label: string;
    variant: "default" | "info" | "success" | "danger";
  }
> = {
  cancelled: {
    label: "Cancelled",
    variant: "danger",
  },
  done: {
    label: "Done",
    variant: "success",
  },
  in_progress: {
    label: "In progress",
    variant: "info",
  },
  todo: {
    label: "To do",
    variant: "default",
  },
};

export function TaskStatusBadge({
  isOverdue = false,
  status,
}: TaskStatusBadgeProps) {
  if (isOverdue && status !== "done" && status !== "cancelled") {
    return <Badge variant="danger">Overdue</Badge>;
  }

  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
