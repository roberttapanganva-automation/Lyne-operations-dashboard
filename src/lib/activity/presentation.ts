import type { createClient } from "@/lib/supabase/server";

export type ActivityIconKey =
  | "access"
  | "automation"
  | "branding"
  | "calendar"
  | "job"
  | "lead"
  | "modules"
  | "pipeline"
  | "settings"
  | "task"
  | "team";

export type AuditActivityLog = {
  action: string;
  actor_user_id: string | null;
  created_at: string;
  entity_id: string | null;
  entity_type: string;
  id: string;
  metadata: Record<string, unknown> | null;
  workspace_id?: string | null;
};

type AuditActivityLookups = {
  actorNames: Map<string, string>;
  appointmentTitles: Map<string, string>;
  jobTitles: Map<string, string>;
  leadTitles: Map<string, string>;
  pipelineGroupNames: Map<string, string>;
  pipelineStageNames: Map<string, string>;
  taskTitles: Map<string, string>;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ActivityPresentation = {
  category: string;
  description: string;
  icon: ActivityIconKey;
  title: string;
};

function valueFromMetadata(
  metadata: Record<string, unknown> | null,
  key: string,
) {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function actorLabel(actorUserId: string | null, lookups: AuditActivityLookups) {
  if (!actorUserId) {
    return "System";
  }

  return lookups.actorNames.get(actorUserId) ?? "Unknown workspace user";
}

function recordLabel(log: AuditActivityLog, lookups: AuditActivityLookups) {
  const titleFromMetadata = valueFromMetadata(log.metadata, "title");

  if (titleFromMetadata) {
    return titleFromMetadata;
  }

  if (!log.entity_id) {
    return null;
  }

  if (log.entity_type === "lead") {
    return lookups.leadTitles.get(log.entity_id) ?? null;
  }

  if (log.entity_type === "job") {
    return lookups.jobTitles.get(log.entity_id) ?? null;
  }

  if (log.entity_type === "task") {
    return lookups.taskTitles.get(log.entity_id) ?? null;
  }

  if (log.entity_type === "appointment") {
    return lookups.appointmentTitles.get(log.entity_id) ?? null;
  }

  if (log.entity_type === "pipeline_group") {
    return lookups.pipelineGroupNames.get(log.entity_id) ?? null;
  }

  if (log.entity_type === "pipeline_stage") {
    return lookups.pipelineStageNames.get(log.entity_id) ?? null;
  }

  return null;
}

function stageLabel(stageId: string | null, lookups: AuditActivityLookups) {
  if (!stageId) {
    return null;
  }

  return lookups.pipelineStageNames.get(stageId) ?? null;
}

function collectUniqueIds(
  logs: AuditActivityLog[],
  extractor: (log: AuditActivityLog) => string | null,
) {
  return [...new Set(logs.map(extractor).filter((value): value is string => Boolean(value)))];
}

async function loadNameMap(
  query: PromiseLike<{
    data: Array<{ id: string; name?: string | null; title?: string | null; full_name?: string | null }> | null;
    error: { message: string } | null;
  }>,
  selector: (row: {
    full_name?: string | null;
    name?: string | null;
    title?: string | null;
  }) => string | null | undefined,
) {
  const { data, error } = await query;

  if (error || !data) {
    return new Map<string, string>();
  }

  return new Map(
    data
      .map((row) => {
        const label = selector(row)?.trim();
        return label ? [row.id, label] : null;
      })
      .filter((entry): entry is [string, string] => Boolean(entry)),
  );
}

function labelFromEmail(email: string | null | undefined) {
  if (!email) {
    return null;
  }

  const label = email.split("@")[0]?.replace(/[._-]+/g, " ").trim();

  return label || email;
}

function titleCaseRole(role: string | null | undefined) {
  if (!role) {
    return null;
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

async function loadActorNames(
  supabase: SupabaseServerClient,
  logs: AuditActivityLog[],
) {
  const actorIds = collectUniqueIds(logs, (log) => log.actor_user_id);

  if (actorIds.length === 0) {
    return new Map<string, string>();
  }

  const workspaceIds = collectUniqueIds(logs, (log) => log.workspace_id ?? null);
  const profileNames = await loadNameMap(
    supabase
      .from("profiles")
      .select("id,full_name")
      .in("id", actorIds)
      .returns<Array<{ full_name: string | null; id: string }>>(),
    (row) => row.full_name,
  );

  const actorNames = new Map(profileNames);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && actorIds.includes(user.id) && !actorNames.has(user.id)) {
    const metadataName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name.trim()
        : null;
    const currentUserLabel = metadataName || labelFromEmail(user.email);

    if (currentUserLabel) {
      actorNames.set(user.id, currentUserLabel);
    }
  }

  let memberQuery = supabase
    .from("workspace_members")
    .select("user_id,invited_email,role")
    .in("user_id", actorIds);

  if (workspaceIds.length > 0) {
    memberQuery = memberQuery.in("workspace_id", workspaceIds);
  }

  const { data: members } = await memberQuery.returns<
    Array<{
      invited_email: string | null;
      role: string | null;
      user_id: string;
    }>
  >();

  for (const member of members ?? []) {
    if (actorNames.has(member.user_id)) {
      continue;
    }

    const memberLabel =
      labelFromEmail(member.invited_email) ?? titleCaseRole(member.role);

    if (memberLabel) {
      actorNames.set(member.user_id, memberLabel);
    }
  }

  return actorNames;
}

export async function buildAuditActivityLookups(
  supabase: SupabaseServerClient,
  logs: AuditActivityLog[],
): Promise<AuditActivityLookups> {
  const leadIds = collectUniqueIds(logs, (log) =>
    log.entity_type === "lead" ? log.entity_id : null,
  );
  const jobIds = collectUniqueIds(logs, (log) =>
    log.entity_type === "job" ? log.entity_id : null,
  );
  const taskIds = collectUniqueIds(logs, (log) =>
    log.entity_type === "task" ? log.entity_id : null,
  );
  const appointmentIds = collectUniqueIds(logs, (log) =>
    log.entity_type === "appointment" ? log.entity_id : null,
  );
  const pipelineGroupIds = [
    ...new Set(
      logs
        .flatMap((log) => [log.entity_type === "pipeline_group" ? log.entity_id : null, valueFromMetadata(log.metadata, "pipeline_group_id")])
        .filter((value): value is string => Boolean(value)),
    ),
  ];
  const pipelineStageIds = [
    ...new Set(
      logs
        .flatMap((log) => [
          log.entity_type === "pipeline_stage" ? log.entity_id : null,
          valueFromMetadata(log.metadata, "from_stage_id"),
          valueFromMetadata(log.metadata, "target_stage_id"),
          valueFromMetadata(log.metadata, "stage_id"),
        ])
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  const [
    actorNames,
    leadTitles,
    jobTitles,
    taskTitles,
    appointmentTitles,
    pipelineGroupNames,
    pipelineStageNames,
  ] = await Promise.all([
    loadActorNames(supabase, logs),
    leadIds.length > 0
      ? loadNameMap(
          supabase
            .from("leads")
            .select("id,title")
            .in("id", leadIds)
            .returns<Array<{ id: string; title: string | null }>>(),
          (row) => row.title,
        )
      : Promise.resolve(new Map<string, string>()),
    jobIds.length > 0
      ? loadNameMap(
          supabase
            .from("jobs")
            .select("id,title")
            .in("id", jobIds)
            .returns<Array<{ id: string; title: string | null }>>(),
          (row) => row.title,
        )
      : Promise.resolve(new Map<string, string>()),
    taskIds.length > 0
      ? loadNameMap(
          supabase
            .from("tasks")
            .select("id,title")
            .in("id", taskIds)
            .returns<Array<{ id: string; title: string | null }>>(),
          (row) => row.title,
        )
      : Promise.resolve(new Map<string, string>()),
    appointmentIds.length > 0
      ? loadNameMap(
          supabase
            .from("appointments")
            .select("id,title")
            .in("id", appointmentIds)
            .returns<Array<{ id: string; title: string | null }>>(),
          (row) => row.title,
        )
      : Promise.resolve(new Map<string, string>()),
    pipelineGroupIds.length > 0
      ? loadNameMap(
          supabase
            .from("pipeline_groups")
            .select("id,name")
            .in("id", pipelineGroupIds)
            .returns<Array<{ id: string; name: string | null }>>(),
          (row) => row.name,
        )
      : Promise.resolve(new Map<string, string>()),
    pipelineStageIds.length > 0
      ? loadNameMap(
          supabase
            .from("pipeline_stages")
            .select("id,name")
            .in("id", pipelineStageIds)
            .returns<Array<{ id: string; name: string | null }>>(),
          (row) => row.name,
        )
      : Promise.resolve(new Map<string, string>()),
  ]);

  return {
    actorNames,
    appointmentTitles,
    jobTitles,
    leadTitles,
    pipelineGroupNames,
    pipelineStageNames,
    taskTitles,
  };
}

export function presentAuditActivity(
  log: AuditActivityLog,
  lookups: AuditActivityLookups,
): ActivityPresentation {
  const actor = actorLabel(log.actor_user_id, lookups);
  const entityName = recordLabel(log, lookups);
  const targetStageName = stageLabel(
    valueFromMetadata(log.metadata, "target_stage_id"),
    lookups,
  );
  const nextStatus = valueFromMetadata(log.metadata, "status");
  const nextRole = valueFromMetadata(log.metadata, "role");

  switch (log.action) {
    case "pipeline.card.moved":
      return {
        category: "Pipeline",
        description: `${actor} moved ${entityName ?? "a pipeline card"} to ${targetStageName ?? "a new stage"}.`,
        icon: "pipeline",
        title: "Pipeline card moved",
      };
    case "lead.created":
      return {
        category: "Lead",
        description: `${actor} added ${entityName ?? "a new lead"} to the workspace.`,
        icon: "lead",
        title: "New lead added",
      };
    case "lead.updated":
      return {
        category: "Lead",
        description: `${actor} updated ${entityName ?? "a lead"}${nextStatus ? ` and set it to ${nextStatus}.` : "."}`,
        icon: "lead",
        title: "Lead updated",
      };
    case "lead.deleted":
      return {
        category: "Lead",
        description: `${actor} removed ${entityName ?? "a lead"} from the workspace.`,
        icon: "lead",
        title: "Lead deleted",
      };
    case "job.created":
      return {
        category: "Jobs",
        description: `${actor} added ${entityName ?? "a new job"} to the schedule.`,
        icon: "job",
        title: "New job added",
      };
    case "job.updated":
      return {
        category: "Jobs",
        description: `${actor} updated ${entityName ?? "a job"}${nextStatus ? ` and set it to ${nextStatus}.` : "."}`,
        icon: "job",
        title: "Job updated",
      };
    case "job.deleted":
      return {
        category: "Jobs",
        description: `${actor} removed ${entityName ?? "a job"} from the workspace.`,
        icon: "job",
        title: "Job deleted",
      };
    case "task.created":
      return {
        category: "Tasks",
        description: `${actor} added ${entityName ?? "a task"} for the team.`,
        icon: "task",
        title: "Task added",
      };
    case "task.updated":
      return {
        category: "Tasks",
        description:
          nextStatus === "done"
            ? `${actor} marked ${entityName ?? "a task"} as done.`
            : nextStatus
              ? `${actor} moved ${entityName ?? "a task"} to ${nextStatus}.`
              : `${actor} updated ${entityName ?? "a task"}.`,
        icon: "task",
        title: "Task updated",
      };
    case "task.deleted":
      return {
        category: "Tasks",
        description: `${actor} deleted ${entityName ?? "a task"}.`,
        icon: "task",
        title: "Task deleted",
      };
    case "lead.assigned":
      return {
        category: "Assignments",
        description: `${actor} updated ownership for ${entityName ?? "a lead"}.`,
        icon: "lead",
        title: "Lead assigned",
      };
    case "lead.auto_assigned":
      return {
        category: "Assignments",
        description: `${entityName ?? "A lead"} was assigned by the round-robin rule.`,
        icon: "automation",
        title: "Lead auto-assigned",
      };
    case "job.assigned":
      return {
        category: "Assignments",
        description: `${actor} updated ownership for ${entityName ?? "a job"}.`,
        icon: "job",
        title: "Job assigned",
      };
    case "task.assigned":
      return {
        category: "Assignments",
        description: `${actor} updated ownership for ${entityName ?? "a task"}.`,
        icon: "task",
        title: "Task assigned",
      };
    case "appointment.created":
      return {
        category: "Calendar",
        description: `${actor} scheduled ${entityName ?? "a new appointment"}.`,
        icon: "calendar",
        title: "Appointment scheduled",
      };
    case "appointment.updated":
      return {
        category: "Calendar",
        description: `${actor} updated ${entityName ?? "an appointment"}.`,
        icon: "calendar",
        title: "Appointment updated",
      };
    case "workspace_branding.updated":
      return {
        category: "Branding",
        description: `${actor} updated the workspace brand, colors, or logo assets.`,
        icon: "branding",
        title: "Branding updated",
      };
    case "workspace_modules.updated":
      return {
        category: "Modules",
        description: `${actor} adjusted which workspace modules are enabled.`,
        icon: "modules",
        title: "Modules updated",
      };
    case "pipeline_group.created":
      return {
        category: "Pipeline",
        description: `${actor} created the ${entityName ?? "pipeline"} workflow.`,
        icon: "pipeline",
        title: "Pipeline created",
      };
    case "pipeline_group.updated":
      return {
        category: "Pipeline",
        description: `${actor} updated the ${entityName ?? "pipeline"} workflow settings.`,
        icon: "pipeline",
        title: "Pipeline updated",
      };
    case "pipeline_group.deleted":
      return {
        category: "Pipeline",
        description: `${actor} removed the ${entityName ?? "pipeline"} workflow.`,
        icon: "pipeline",
        title: "Pipeline deleted",
      };
    case "pipeline_stage.created":
      return {
        category: "Pipeline",
        description: `${actor} added the ${entityName ?? "stage"} stage to the board.`,
        icon: "pipeline",
        title: "Pipeline stage added",
      };
    case "pipeline_stage.updated":
      return {
        category: "Pipeline",
        description: `${actor} updated the ${entityName ?? "stage"} stage.`,
        icon: "pipeline",
        title: "Pipeline stage updated",
      };
    case "pipeline_stage.deleted":
      return {
        category: "Pipeline",
        description: `${actor} removed the ${entityName ?? "stage"} stage.`,
        icon: "pipeline",
        title: "Pipeline stage removed",
      };
    case "invitation.created":
      return {
        category: "Team",
        description: `${actor} invited ${valueFromMetadata(log.metadata, "invited_email") ?? "a teammate"} to the workspace.`,
        icon: "team",
        title: "Team invitation sent",
      };
    case "invitation.updated":
      return {
        category: "Team",
        description: `${actor} updated an invitation for ${valueFromMetadata(log.metadata, "invited_email") ?? "a teammate"}.`,
        icon: "team",
        title: "Invitation updated",
      };
    case "member.role.updated":
      return {
        category: "Access",
        description: `${actor} changed a workspace member role${nextRole ? ` to ${nextRole}` : ""}.`,
        icon: "access",
        title: "Role updated",
      };
    case "access_rules.updated":
    case "access_rule.updated":
      return {
        category: "Access",
        description: `${actor} updated workspace access rules and permissions.`,
        icon: "access",
        title: "Access rules updated",
      };
    case "api_key.created":
      return {
        category: "Automation",
        description: `${actor} created a workspace API key for automation access.`,
        icon: "automation",
        title: "API key created",
      };
    case "api_key.revoked":
      return {
        category: "Automation",
        description: `${actor} revoked a workspace API key.`,
        icon: "automation",
        title: "API key revoked",
      };
    case "api_key.renamed":
      return {
        category: "Automation",
        description: `${actor} renamed a workspace API key.`,
        icon: "automation",
        title: "API key renamed",
      };
    case "api_key.rotated":
      return {
        category: "Automation",
        description: `${actor} rotated a workspace API key.`,
        icon: "automation",
        title: "API key rotated",
      };
    default:
      return {
        category: "Workspace",
        description: `${actor} recorded a workspace update.`,
        icon: "settings",
        title: log.action.replaceAll(".", " "),
      };
  }
}
