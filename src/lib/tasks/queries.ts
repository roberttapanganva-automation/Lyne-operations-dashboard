import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import type { TaskListItem } from "@/components/tasks/TasksList";

type TaskRow = {
  assigned_to: string | null;
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

type ProfileRow = {
  full_name: string | null;
  id: string;
};

function normalizeTask(
  row: TaskRow,
  profilesById: Map<string, ProfileRow>,
): TaskListItem {
  const assignedUser = row.assigned_to
    ? profilesById.get(row.assigned_to) ?? null
    : null;

  return {
    assigned_to: row.assigned_to,
    assigned_user: assignedUser
      ? {
          full_name: assignedUser.full_name,
          id: assignedUser.id,
        }
      : null,
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
  const { data, error } = await supabase
    .from("tasks")
    .select(
      "id,title,description,due_at,priority,status,related_type,related_id,assigned_to,completed_at,created_at",
    )
    .eq("workspace_id", activeWorkspace.context.workspace.id)
    .order("created_at", { ascending: false })
    .returns<TaskRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const tasks = data ?? [];
  const assignedUserIds = [
    ...new Set(
      tasks
        .map((task) => task.assigned_to)
        .filter((assignedTo): assignedTo is string => Boolean(assignedTo)),
    ),
  ];
  const profilesById = new Map<string, ProfileRow>();

  if (assignedUserIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id,full_name")
      .in("id", assignedUserIds)
      .returns<ProfileRow[]>();

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    for (const profile of profiles ?? []) {
      profilesById.set(profile.id, profile);
    }
  }

  return tasks.map((task) => normalizeTask(task, profilesById));
}
