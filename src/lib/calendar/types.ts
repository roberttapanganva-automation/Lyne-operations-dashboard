import type { AssignableWorkspaceMember, WorkspaceRole } from "@/types/domain";

export type CalendarPageTab = "calendar" | "list" | "settings";

export type CalendarViewMode = "month" | "week" | "day";

export type CalendarManageViewType = "all" | "appointments" | "scheduled_jobs";

export type CalendarAppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type CalendarJobStatus =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type CalendarAppointmentRecord = {
  client: {
    email: string | null;
    name: string;
  } | null;
  client_id: string | null;
  created_at: string;
  created_by: string | null;
  ends_at: string | null;
  id: string;
  job_id: string | null;
  location: string | null;
  notes: string | null;
  starts_at: string;
  status: CalendarAppointmentStatus;
  title: string;
};

export type CalendarJobRecord = {
  assigned_member: AssignableWorkspaceMember | null;
  assigned_member_id: string | null;
  client: {
    email: string | null;
    name: string;
  } | null;
  client_id: string | null;
  created_at: string;
  estimated_value: number;
  id: string;
  location: string | null;
  payment_status:
    | "unpaid"
    | "partial"
    | "paid"
    | "refunded"
    | "not_applicable";
  scheduled_end: string | null;
  scheduled_start: string | null;
  service_type: string | null;
  status: CalendarJobStatus;
  title: string;
};

export type CalendarEvent = {
  assigned_member_id: string | null;
  assigned_member_name: string | null;
  client_email: string | null;
  client_name: string | null;
  date_key: string;
  ends_at: string | null;
  id: string;
  location: string | null;
  source_record_id: string;
  starts_at: string;
  status: string;
  title: string;
  type: "appointment" | "job";
  appointment: CalendarAppointmentRecord | null;
  job: CalendarJobRecord | null;
};

export type CalendarFilterMember = {
  avatar_url: string | null;
  email: string | null;
  id: string;
  label: string;
  role: WorkspaceRole;
  user_id: string;
};

export type CalendarMonthData = {
  events: CalendarEvent[];
  filter_members: CalendarFilterMember[];
  visible_appointments: CalendarAppointmentRecord[];
};
