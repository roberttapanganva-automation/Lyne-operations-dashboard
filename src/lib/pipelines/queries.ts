import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { getEffectiveRolePermission } from "@/lib/permissions/effective";
import {
  canCreateOperationalRecords,
  canManageOperations,
} from "@/lib/permissions/workspace";
import type {
  DashboardPipelineStageSummary,
  PipelineBoard,
  PipelineBoardCard,
  PipelineBoardStage,
  PipelineBoardSummary,
  PipelineEntityType,
  PipelineGroup,
  PipelineStage,
} from "@/types/domain";

type PipelineGroupRow = PipelineGroup;

type PipelineStageRow = PipelineStage;

export type LeadPipelineStageOption = {
  groupName: string;
  id: string;
  name: string;
};

type LeadBoardRow = {
  clients: {
    email: string | null;
    name: string | null;
  } | null;
  estimated_value: number | string;
  id: string;
  next_follow_up_at: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  source: string | null;
  stage_id: string | null;
  status: "open" | "won" | "lost";
  title: string;
};

type JobBoardRow = {
  clients: {
    email: string | null;
    name: string | null;
  } | null;
  estimated_value: number | string;
  id: string;
  location: string | null;
  payment_status:
    | "unpaid"
    | "partial"
    | "paid"
    | "refunded"
    | "not_applicable";
  scheduled_start: string | null;
  service_type: string | null;
  stage_id: string | null;
  status: "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";
  title: string;
};

function isPipelineSchemaPendingMessage(message: string | null | undefined) {
  if (!message) {
    return false;
  }

  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("could not find the table 'public.pipeline_groups'") ||
    normalizedMessage.includes('relation "public.pipeline_groups" does not exist') ||
    normalizedMessage.includes("could not find the 'pipeline_group_id' column") ||
    normalizedMessage.includes('column "pipeline_group_id" does not exist')
  );
}

function byEntityTypeThenOrder(
  first: { created_at: string; entity_type: PipelineEntityType; order_index: number },
  second: { created_at: string; entity_type: PipelineEntityType; order_index: number },
) {
  const entityOrder = {
    lead: 0,
    job: 1,
  } as const;

  if (first.entity_type !== second.entity_type) {
    return entityOrder[first.entity_type] - entityOrder[second.entity_type];
  }

  if (first.order_index !== second.order_index) {
    return first.order_index - second.order_index;
  }

  return (
    new Date(first.created_at).getTime() - new Date(second.created_at).getTime()
  );
}

function sortCards(cards: PipelineBoardCard[]) {
  return [...cards].sort((first, second) => {
    const firstDate =
      first.entity_type === "lead"
        ? first.next_follow_up_at
        : first.scheduled_start;
    const secondDate =
      second.entity_type === "lead"
        ? second.next_follow_up_at
        : second.scheduled_start;

    if (firstDate && secondDate) {
      return new Date(firstDate).getTime() - new Date(secondDate).getTime();
    }

    if (firstDate) {
      return -1;
    }

    if (secondDate) {
      return 1;
    }

    return first.title.localeCompare(second.title);
  });
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return typeof value === "number" ? value : Number(value);
}

function normalizeLeadCard(row: LeadBoardRow): PipelineBoardCard {
  return {
    client: row.clients,
    entity_type: "lead",
    estimated_value: toNumber(row.estimated_value),
    id: row.id,
    location: null,
    next_follow_up_at: row.next_follow_up_at,
    payment_status: null,
    priority: row.priority,
    scheduled_start: null,
    service_type: null,
    source: row.source,
    stage_id: row.stage_id,
    status: row.status,
    title: row.title,
  };
}

function normalizeJobCard(row: JobBoardRow): PipelineBoardCard {
  return {
    client: row.clients,
    entity_type: "job",
    estimated_value: toNumber(row.estimated_value),
    id: row.id,
    location: row.location,
    next_follow_up_at: null,
    payment_status: row.payment_status,
    priority: null,
    scheduled_start: row.scheduled_start,
    service_type: row.service_type,
    source: null,
    stage_id: row.stage_id,
    status: row.status,
    title: row.title,
  };
}

function selectPipelineGroup(
  groups: PipelineGroup[],
  requestedGroupId?: string,
) {
  if (groups.length === 0) {
    return null;
  }

  if (requestedGroupId) {
    const matchingGroup = groups.find((group) => group.id === requestedGroupId);

    if (matchingGroup) {
      return matchingGroup;
    }
  }

  return (
    groups.find((group) => group.is_default) ??
    [...groups].sort(byEntityTypeThenOrder)[0]
  );
}

function buildStageSummaries(stages: PipelineBoardStage[]): DashboardPipelineStageSummary[] {
  return stages.map((stage) => ({
    color: stage.color,
    count: stage.card_count,
    entity_type: stage.entity_type,
    id: stage.id,
    name: stage.name,
    order_index: stage.order_index,
  }));
}

export async function getPipelineGroupsForActiveWorkspace(): Promise<PipelineGroup[]> {
  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pipeline_groups")
    .select(
      "id,workspace_id,name,description,entity_type,order_index,is_default,created_by,updated_by,created_at,updated_at",
    )
    .eq("workspace_id", activeWorkspace.context.workspace.id)
    .returns<PipelineGroupRow[]>();

  if (error) {
    if (isPipelineSchemaPendingMessage(error.message)) {
      console.warn("Pipeline groups unavailable while migration is pending", {
        message: error.message,
      });

      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []).sort(byEntityTypeThenOrder);
}

export async function getLeadPipelineStageOptionsForActiveWorkspace(): Promise<
  LeadPipelineStageOption[]
> {
  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return [];
  }

  const supabase = await createClient();
  const workspaceId = activeWorkspace.context.workspace.id;
  const [{ data: groups, error: groupsError }, { data: stages, error: stagesError }] =
    await Promise.all([
      supabase
        .from("pipeline_groups")
        .select("id,name,order_index,created_at")
        .eq("workspace_id", workspaceId)
        .eq("entity_type", "lead")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true })
        .returns<Array<{ created_at: string; id: string; name: string; order_index: number }>>(),
      supabase
        .from("pipeline_stages")
        .select("id,name,pipeline_group_id,order_index,created_at")
        .eq("workspace_id", workspaceId)
        .eq("entity_type", "lead")
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true })
        .returns<
          Array<{
            created_at: string;
            id: string;
            name: string;
            order_index: number;
            pipeline_group_id: string;
          }>
        >(),
    ]);

  if (groupsError || stagesError) {
    const message = groupsError?.message ?? stagesError?.message;

    if (isPipelineSchemaPendingMessage(message)) {
      console.warn("Lead pipeline stage options unavailable while migration is pending", {
        message,
      });

      return [];
    }

    throw new Error(message);
  }

  const groupsById = new Map((groups ?? []).map((group) => [group.id, group.name]));

  return (stages ?? []).map((stage) => ({
    groupName: groupsById.get(stage.pipeline_group_id) ?? "Lead pipeline",
    id: stage.id,
    name: stage.name,
  }));
}

export async function getPipelineCardsByStage({
  entityType,
  stageIds,
  workspaceId,
}: {
  entityType: PipelineEntityType;
  stageIds: string[];
  workspaceId: string;
}) {
  if (stageIds.length === 0) {
    return new Map<string, PipelineBoardCard[]>();
  }

  const supabase = await createClient();

  if (entityType === "lead") {
    const { data, error } = await supabase
      .from("leads")
      .select(
        "id,title,stage_id,estimated_value,priority,next_follow_up_at,status,source,clients(name,email)",
      )
      .eq("workspace_id", workspaceId)
      .in("stage_id", stageIds)
      .returns<LeadBoardRow[]>();

    if (error) {
      throw new Error(error.message);
    }

    const cardsByStage = new Map<string, PipelineBoardCard[]>();

    for (const row of data ?? []) {
      if (!row.stage_id) {
        continue;
      }

      const currentCards = cardsByStage.get(row.stage_id) ?? [];
      currentCards.push(normalizeLeadCard(row));
      cardsByStage.set(row.stage_id, currentCards);
    }

    return cardsByStage;
  }

  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id,title,stage_id,service_type,estimated_value,scheduled_start,location,status,payment_status,clients(name,email)",
    )
    .eq("workspace_id", workspaceId)
    .in("stage_id", stageIds)
    .returns<JobBoardRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const cardsByStage = new Map<string, PipelineBoardCard[]>();

  for (const row of data ?? []) {
    if (!row.stage_id) {
      continue;
    }

    const currentCards = cardsByStage.get(row.stage_id) ?? [];
    currentCards.push(normalizeJobCard(row));
    cardsByStage.set(row.stage_id, currentCards);
  }

  return cardsByStage;
}

export async function getPipelineBoardForActiveWorkspace(
  pipelineGroupId?: string,
): Promise<PipelineBoard> {
  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return {
      can_create_leads: false,
      can_move_cards: false,
      entity_type: null,
      groups: [],
      selected_group: null,
      stages: [],
    };
  }

  const supabase = await createClient();
  const workspaceId = activeWorkspace.context.workspace.id;
  const rolePermission = await getEffectiveRolePermission({
    role: activeWorkspace.context.role,
    supabase,
    workspaceId,
  });
  const canMoveCards = canManageOperations(activeWorkspace.context.role);
  const canCreateLeads =
    canCreateOperationalRecords(activeWorkspace.context.role) &&
    rolePermission?.can_create_leads !== false;
  const { data: groups, error: groupsError } = await supabase
    .from("pipeline_groups")
    .select(
      "id,workspace_id,name,description,entity_type,order_index,is_default,created_by,updated_by,created_at,updated_at",
    )
    .eq("workspace_id", workspaceId)
    .returns<PipelineGroupRow[]>();

  if (groupsError) {
    if (isPipelineSchemaPendingMessage(groupsError.message)) {
      console.warn("Pipeline board unavailable while migration is pending", {
        message: groupsError.message,
      });

      return {
        can_create_leads: canCreateLeads,
        can_move_cards: canMoveCards,
        entity_type: null,
        groups: [],
        selected_group: null,
        stages: [],
      };
    }

    throw new Error(groupsError.message);
  }

  const sortedGroups = (groups ?? []).sort(byEntityTypeThenOrder);
  const selectedGroup = selectPipelineGroup(sortedGroups, pipelineGroupId);

  if (!selectedGroup) {
    return {
      can_create_leads: canCreateLeads,
      can_move_cards: canMoveCards,
      entity_type: null,
      groups: sortedGroups,
      selected_group: null,
      stages: [],
    };
  }

  const { data: stages, error: stagesError } = await supabase
    .from("pipeline_stages")
    .select(
      "id,workspace_id,pipeline_group_id,entity_type,name,color,order_index,is_closed,is_won,is_lost,created_at,updated_at",
    )
    .eq("workspace_id", workspaceId)
    .eq("pipeline_group_id", selectedGroup.id)
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<PipelineStageRow[]>();

  if (stagesError) {
    if (isPipelineSchemaPendingMessage(stagesError.message)) {
      console.warn("Pipeline stages unavailable while migration is pending", {
        message: stagesError.message,
      });

      return {
        can_create_leads: canCreateLeads,
        can_move_cards: canMoveCards,
        entity_type: selectedGroup.entity_type,
        groups: sortedGroups,
        selected_group: selectedGroup,
        stages: [],
      };
    }

    throw new Error(stagesError.message);
  }

  const stageRows = stages ?? [];
  const cardsByStage = await getPipelineCardsByStage({
    entityType: selectedGroup.entity_type,
    stageIds: stageRows.map((stage) => stage.id),
    workspaceId,
  });

  const boardStages: PipelineBoardStage[] = stageRows.map((stage) => {
    const cards = cardsByStage.get(stage.id) ?? [];

    return {
      ...stage,
      card_count: cards.length,
      cards: sortCards(cards),
      total_estimated_value: cards.reduce(
        (total, card) => total + toNumber(card.estimated_value),
        0,
      ),
    };
  });

  return {
    can_create_leads: canCreateLeads,
    can_move_cards: canMoveCards,
    entity_type: selectedGroup.entity_type,
    groups: sortedGroups,
    selected_group: selectedGroup,
    stages: boardStages,
  };
}

export async function getPipelinePreviewForDashboard(): Promise<PipelineBoardSummary> {
  try {
    const board = await getPipelineBoardForActiveWorkspace();
    const stages = buildStageSummaries(board.stages);

    return {
      entity_type: board.entity_type,
      group: board.selected_group,
      has_configured_stages: board.stages.length > 0,
      has_error: false,
      stages,
      total_cards: board.stages.reduce(
        (total, stage) => total + stage.card_count,
        0,
      ),
      total_estimated_value: board.stages.reduce(
        (total, stage) => total + stage.total_estimated_value,
        0,
      ),
    };
  } catch (error) {
    console.error("Dashboard pipeline preview failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return {
      entity_type: null,
      group: null,
      has_configured_stages: false,
      has_error: true,
      stages: [],
      total_cards: 0,
      total_estimated_value: 0,
    };
  }
}

export { isPipelineSchemaPendingMessage };
