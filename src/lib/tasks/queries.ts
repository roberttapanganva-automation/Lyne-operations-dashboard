import { createClient } from "@/lib/supabase/server";
import { getAssignmentDisplayMapForWorkspace } from "@/lib/assignments/queries";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import type { AssignableWorkspaceMember } from "@/types/domain";
import type { TaskListItem } from "@/components/tasks/TasksList";

type TaskRow = {
  assigned_member_id: string | null;
  completed_at: string | null;
  created_at: string;
  description: string | null;
  due_at: string | null;
  id: string;
  priority: TaskListItem["priority"];
  related_id: string | null;
  related_type: TaskListItem["related_type"];
  status: TaskListItem["status"];
  title: string;
};

function isMissingAssignmentColumnError(error: { message?: string } | null) {
  return Boolean(
    error?.message?.includes("assigned_member_id") &&
      error.message.includes("does not exist"),
  );
}

function normalizeTask(
  row: TaskRow,
  assignmentsByMemberId: Map<string, AssignableWorkspaceMember>,
): TaskListItem {
  return {
    assigned_member: row.assigned_member_id
      ? assignmentsByMemberId.get(row.assigned_member_id) ?? null
      : null,
    assigned_member_id: row.assigned_member_id,
    completed_at: row.completed_at,
    created_at: row.created_at,
    description: row.description,
    due_at: row.due_at,
    id: row.id,
    priority: row.priority,
    related_id: row.related_id,
    related_type: row.related_type,
    status: row.status,
    title: row.title,
  };
}

export async function getTasksForActiveWorkspace(): Promise<TaskListItem[]> {
  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return [];
  }

  const supabase = await createClient();
  const workspaceId = activeWorkspace.context.workspace.id;
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id,assigned_member_id,title,description,due_at,priority,status,related_type,related_id,completed_at,created_at",
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .returns<TaskRow[]>();

  if (error) {
    if (isMissingAssignmentColumnError(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("tasks")
        .select(
          "id,title,description,due_at,priority,status,related_type,related_id,completed_at,created_at",
        )
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .returns<Omit<TaskRow, "assigned_member_id">[]>();

      if (fallbackError) {
        throw new Error(fallbackError.message);
      }

      return await normalizeTasksForDisplay({
        supabase,
        tasks: (fallbackData ?? []).map((task) => ({
          ...task,
          assigned_member_id: null,
        })),
        workspaceId,
      });
    }

    throw new Error(error.message);
  }

  const tasks = data ?? [];
  return await normalizeTasksForDisplay({
    supabase,
    tasks,
    workspaceId,
  });
}

async function normalizeTasksForDisplay({
  supabase,
  tasks,
  workspaceId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  tasks: TaskRow[];
  workspaceId: string;
}) {
  const assignmentsByMemberId = await getAssignmentDisplayMapForWorkspace({
    memberIds: tasks
      .map((task) => task.assigned_member_id)
      .filter((memberId): memberId is string => Boolean(memberId)),
    supabase,
    workspaceId,
  });

  return tasks.map((task) => normalizeTask(task, assignmentsByMemberId));
}
