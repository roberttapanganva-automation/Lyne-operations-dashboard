import "server-only";

import {
  getAssignmentDisplayMapForWorkspace,
  normalizeAssignableMember,
} from "@/lib/assignments/queries";
import type {
  CalendarAppointmentRecord,
  CalendarEvent,
  CalendarFilterMember,
  CalendarJobRecord,
  CalendarMonthData,
  CalendarViewMode,
} from "@/lib/calendar/types";
import {
  addUtcDays,
  getCalendarViewRange,
  formatDateKeyInTimeZone,
} from "@/lib/calendar/utils";
import {
  canCreateOperationalRecords,
  canViewWorkspace,
} from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import type {
  ActiveWorkspaceContext,
  WorkspaceRole,
  WorkspaceRolePermission,
} from "@/types/domain";

type AppointmentRow = {
  client_id: string | null;
  clients: {
    email: string | null;
    name: string;
  } | null;
  created_at: string;
  created_by: string | null;
  ends_at: string | null;
  id: string;
  job_id: string | null;
  location: string | null;
  notes: string | null;
  starts_at: string;
  status: CalendarAppointmentRecord["status"];
  title: string;
};

type JobRow = {
  assigned_member_id: string | null;
  client_id: string | null;
  clients: {
    email: string | null;
    name: string;
  } | null;
  created_at: string;
  estimated_value: number | string;
  id: string;
  location: string | null;
  payment_status: CalendarJobRecord["payment_status"];
  scheduled_end: string | null;
  scheduled_start: string | null;
  service_type: string | null;
  status: CalendarJobRecord["status"];
  title: string;
};

type MemberRow = {
  id: string;
  invited_email: string | null;
  role: WorkspaceRole;
  status: "active" | "invited" | "disabled";
  user_id: string;
};

type ProfileRow = {
  avatar_url: string | null;
  full_name: string | null;
  id: string;
};

function isTruthy(value: string | null | undefined): value is string {
  return Boolean(value && value.trim().length > 0);
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return typeof value === "number" ? value : Number(value);
}

function getProfileDisplayName(member: MemberRow, profile: ProfileRow | undefined) {
  return (
    profile?.full_name?.trim() ||
    member.invited_email?.split("@")[0]?.replace(/[._-]+/g, " ").trim() ||
    "Workspace member"
  );
}

async function loadProfilesByUserId({
  supabase,
  userIds,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userIds: string[];
}) {
  if (userIds.length === 0) {
    return new Map<string, ProfileRow>();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,full_name,avatar_url")
    .in("id", userIds)
    .returns<ProfileRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((profile) => [profile.id, profile]));
}

function normalizeAppointment(row: AppointmentRow): CalendarAppointmentRecord {
  return {
    client: row.clients
      ? {
          email: row.clients.email,
          name: row.clients.name,
        }
      : null,
    client_id: row.client_id,
    created_at: row.created_at,
    created_by: row.created_by,
    ends_at: row.ends_at,
    id: row.id,
    job_id: row.job_id,
    location: row.location,
    notes: row.notes,
    starts_at: row.starts_at,
    status: row.status,
    title: row.title,
  };
}

function normalizeJob({
  assignmentDisplayMap,
  row,
}: {
  assignmentDisplayMap: Map<string, Awaited<ReturnType<typeof normalizeAssignableMember>>>;
  row: JobRow;
}): CalendarJobRecord {
  return {
    assigned_member: row.assigned_member_id
      ? assignmentDisplayMap.get(row.assigned_member_id) ?? null
      : null,
    assigned_member_id: row.assigned_member_id,
    client: row.clients
      ? {
          email: row.clients.email,
          name: row.clients.name,
        }
      : null,
    client_id: row.client_id,
    created_at: row.created_at,
    estimated_value: toNumber(row.estimated_value),
    id: row.id,
    location: row.location,
    payment_status: row.payment_status,
    scheduled_end: row.scheduled_end,
    scheduled_start: row.scheduled_start,
    service_type: row.service_type,
    status: row.status,
    title: row.title,
  };
}

function canViewWorkspaceCalendar(role: WorkspaceRole) {
  return role === "owner" || role === "admin" || role === "manager" || role === "viewer";
}

function filterAppointmentsForRole({
  appointments,
  currentMemberId,
  currentUserId,
  role,
  visibleJobIds,
}: {
  appointments: CalendarAppointmentRecord[];
  currentMemberId: string | null;
  currentUserId: string;
  role: WorkspaceRole;
  visibleJobIds: Set<string>;
}) {
  if (canViewWorkspaceCalendar(role)) {
    return appointments;
  }

  if (role !== "staff") {
    return [];
  }

  return appointments.filter((appointment) => {
    if (appointment.job_id && visibleJobIds.has(appointment.job_id)) {
      return true;
    }

    if (appointment.created_by === currentUserId) {
      return true;
    }

    return Boolean(currentMemberId && appointment.job_id && visibleJobIds.has(appointment.job_id));
  });
}

function filterJobsForRole({
  currentMemberId,
  jobs,
  role,
}: {
  currentMemberId: string | null;
  jobs: CalendarJobRecord[];
  role: WorkspaceRole;
}) {
  if (canViewWorkspaceCalendar(role)) {
    return jobs;
  }

  if (role !== "staff" || !currentMemberId) {
    return [];
  }

  return jobs.filter((job) => job.assigned_member_id === currentMemberId);
}

function filterEventsWithinRange({
  events,
  rangeEndExclusiveKey,
  rangeStartKey,
}: {
  events: CalendarEvent[];
  rangeEndExclusiveKey: string;
  rangeStartKey: string;
}) {
  return events.filter(
    (event) =>
      event.date_key >= rangeStartKey && event.date_key < rangeEndExclusiveKey,
  );
}

function normalizeCalendarEvents({
  appointments,
  jobs,
  timezone,
}: {
  appointments: CalendarAppointmentRecord[];
  jobs: CalendarJobRecord[];
  timezone: string;
}) {
  const appointmentEvents: CalendarEvent[] = appointments.map((appointment) => ({
    assigned_member_id: null,
    assigned_member_name: null,
    appointment,
    client_email: appointment.client?.email ?? null,
    client_name: appointment.client?.name ?? null,
    date_key: formatDateKeyInTimeZone(appointment.starts_at, timezone),
    ends_at: appointment.ends_at,
    id: `appointment-${appointment.id}`,
    job: null,
    location: appointment.location,
    source_record_id: appointment.id,
    starts_at: appointment.starts_at,
    status: appointment.status,
    title: appointment.title,
    type: "appointment",
  }));

  const jobEvents: CalendarEvent[] = jobs
    .filter((job) => job.scheduled_start)
    .map((job) => ({
      assigned_member_id: job.assigned_member_id,
      assigned_member_name: job.assigned_member?.display_name ?? null,
      appointment: null,
      client_email: job.client?.email ?? null,
      client_name: job.client?.name ?? null,
      date_key: formatDateKeyInTimeZone(job.scheduled_start as string, timezone),
      ends_at: job.scheduled_end,
      id: `job-${job.id}`,
      job,
      location: job.location,
      source_record_id: job.id,
      starts_at: job.scheduled_start as string,
      status: job.status,
      title: job.title,
      type: "job",
    }));

  return [...appointmentEvents, ...jobEvents].sort(
    (first, second) =>
      new Date(first.starts_at).getTime() - new Date(second.starts_at).getTime(),
  );
}

async function getFilterMembers({
  supabase,
  workspaceId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  workspaceId: string;
}) {
  const { data: members, error } = await supabase
    .from("workspace_members")
    .select("id,user_id,role,status,invited_email")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("role", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<MemberRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const profilesByUserId = await loadProfilesByUserId({
    supabase,
    userIds: [...new Set((members ?? []).map((member) => member.user_id))],
  });

  return (members ?? []).map((member) => {
    const profile = profilesByUserId.get(member.user_id);
    const label = getProfileDisplayName(member, profile);

    return {
      avatar_url: profile?.avatar_url ?? null,
      email: member.invited_email,
      id: member.id,
      label,
      role: member.role,
      user_id: member.user_id,
    } satisfies CalendarFilterMember;
  });
}

async function getCurrentWorkspaceMemberId({
  currentUserId,
  supabase,
  workspaceId,
}: {
  currentUserId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  workspaceId: string;
}) {
  const { data } = await supabase
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", currentUserId)
    .eq("status", "active")
    .maybeSingle<{ id: string }>();

  return data?.id ?? null;
}

export async function getVisibleAppointmentsForCalendarList({
  activeWorkspace,
  currentUserId,
  supabase,
}: {
  activeWorkspace: ActiveWorkspaceContext;
  currentUserId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  if (
    !canViewWorkspace(activeWorkspace.role) ||
    activeWorkspace.modules?.calendar_enabled === false
  ) {
    return [];
  }

  const workspaceId = activeWorkspace.workspace.id;
  const currentMemberId = await getCurrentWorkspaceMemberId({
    currentUserId,
    supabase,
    workspaceId,
  });
  const [{ data: appointmentRows, error: appointmentError }, { data: relatedJobs, error: jobsError }] =
    await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id,client_id,title,starts_at,ends_at,location,status,notes,created_at,created_by,job_id,clients(name,email)",
        )
        .eq("workspace_id", workspaceId)
        .order("starts_at", { ascending: true })
        .returns<AppointmentRow[]>(),
      supabase
        .from("jobs")
        .select("id,assigned_member_id")
        .eq("workspace_id", workspaceId)
        .returns<Array<{ assigned_member_id: string | null; id: string }>>(),
    ]);

  if (appointmentError || jobsError) {
    throw new Error(appointmentError?.message ?? jobsError?.message);
  }

  const visibleJobIds = new Set(
    (relatedJobs ?? [])
      .filter((job) =>
        canViewWorkspaceCalendar(activeWorkspace.role)
          ? true
          : job.assigned_member_id === currentMemberId,
      )
      .map((job) => job.id),
  );

  return filterAppointmentsForRole({
    appointments: (appointmentRows ?? []).map(normalizeAppointment),
    currentMemberId,
    currentUserId,
    role: activeWorkspace.role,
    visibleJobIds,
  });
}

export async function getCalendarMonthData({
  activeWorkspace,
  currentUserId,
  dateKey,
  supabase,
  viewMode = "month",
  yearMonth,
}: {
  activeWorkspace: ActiveWorkspaceContext;
  currentUserId: string;
  dateKey?: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  viewMode?: CalendarViewMode;
  yearMonth?: string;
}): Promise<CalendarMonthData> {
  if (!canViewWorkspace(activeWorkspace.role) || activeWorkspace.modules?.calendar_enabled === false) {
    return {
      events: [],
      filter_members: [],
      visible_appointments: [],
    };
  }

  const range = getCalendarViewRange({
    dateKey,
    view: viewMode,
    yearMonth,
  });
  const queryStart = addUtcDays(range.rangeStartDate, -1).toISOString();
  const queryEnd = addUtcDays(range.rangeEndDateExclusive, 1).toISOString();
  const workspaceId = activeWorkspace.workspace.id;
  const [currentMemberId, { data: appointmentRows, error: appointmentError }, { data: jobRows, error: jobError }, filterMembers] =
    await Promise.all([
      getCurrentWorkspaceMemberId({
        currentUserId,
        supabase,
        workspaceId,
      }),
      supabase
        .from("appointments")
        .select(
          "id,client_id,title,starts_at,ends_at,location,status,notes,created_at,created_by,job_id,clients(name,email)",
        )
        .eq("workspace_id", workspaceId)
        .gte("starts_at", queryStart)
        .lt("starts_at", queryEnd)
        .order("starts_at", { ascending: true })
        .returns<AppointmentRow[]>(),
      supabase
        .from("jobs")
        .select(
          "id,title,service_type,scheduled_start,scheduled_end,location,estimated_value,payment_status,status,created_at,client_id,assigned_member_id,clients(name,email)",
        )
        .eq("workspace_id", workspaceId)
        .not("scheduled_start", "is", null)
        .gte("scheduled_start", queryStart)
        .lt("scheduled_start", queryEnd)
        .order("scheduled_start", { ascending: true })
        .returns<JobRow[]>(),
      getFilterMembers({
        supabase,
        workspaceId,
      }),
    ]);

  if (appointmentError || jobError) {
    throw new Error(appointmentError?.message ?? jobError?.message);
  }

  const assignmentDisplayMap = await getAssignmentDisplayMapForWorkspace({
    memberIds: [...new Set((jobRows ?? []).map((job) => job.assigned_member_id).filter(isTruthy))],
    supabase,
    workspaceId,
  });

  const appointments = (appointmentRows ?? []).map(normalizeAppointment);
  const jobs = (jobRows ?? []).map((row) =>
    normalizeJob({
      assignmentDisplayMap,
      row,
    }),
  );
  const visibleJobs = filterJobsForRole({
    currentMemberId,
    jobs,
    role: activeWorkspace.role,
  });
  const visibleJobIds = new Set(visibleJobs.map((job) => job.id));
  const visibleAppointments = filterAppointmentsForRole({
    appointments,
    currentMemberId,
    currentUserId,
    role: activeWorkspace.role,
    visibleJobIds,
  });
  const events = filterEventsWithinRange({
    events: normalizeCalendarEvents({
      appointments: visibleAppointments,
      jobs: visibleJobs,
      timezone: activeWorkspace.workspace.timezone,
    }),
    rangeEndExclusiveKey: range.rangeEndExclusiveKey,
    rangeStartKey: range.rangeStartKey,
  });

  return {
    events,
    filter_members:
      activeWorkspace.role === "owner" ||
      activeWorkspace.role === "admin" ||
      activeWorkspace.role === "manager"
        ? filterMembers
        : [],
    visible_appointments: visibleAppointments,
  };
}

export function canCreateCalendarRecords({
  role,
  rolePermission,
}: {
  role: WorkspaceRole;
  rolePermission: WorkspaceRolePermission | null;
}) {
  return canCreateOperationalRecords(role) && rolePermission?.can_create_appointments !== false;
}
