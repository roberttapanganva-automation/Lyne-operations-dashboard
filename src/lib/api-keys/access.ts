import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import type { ActiveWorkspaceContext } from "@/types/domain";

export type ApiKeyManagementAccess =
  | {
      activeWorkspace: ActiveWorkspaceContext;
      error?: never;
      status: "ready";
      supabase: Awaited<ReturnType<typeof createClient>>;
      user: {
        id: string;
      };
    }
  | {
      activeWorkspace: null;
      error: {
        code: string;
        message: string;
      };
      status: "forbidden" | "unauthorized" | "error";
      supabase: Awaited<ReturnType<typeof createClient>>;
      user?: never;
    };

export async function getApiKeyManagementAccess(): Promise<ApiKeyManagementAccess> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      activeWorkspace: null,
      error: {
        code: "UNAUTHORIZED",
        message: "Sign in to manage automation API keys.",
      },
      status: "unauthorized",
      supabase,
    };
  }

  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return {
      activeWorkspace: null,
      error: {
        code: "NO_ACTIVE_WORKSPACE",
        message:
          activeWorkspace.error ??
          "No active workspace is available for this account.",
      },
      status:
        activeWorkspace.status === "no-user" ? "unauthorized" : "forbidden",
      supabase,
    };
  }

  if (
    activeWorkspace.context.role !== "owner" &&
    activeWorkspace.context.role !== "admin"
  ) {
    return {
      activeWorkspace: null,
      error: {
        code: "FORBIDDEN",
        message: "Only owners and admins can manage automation API keys.",
      },
      status: "forbidden",
      supabase,
    };
  }

  return {
    activeWorkspace: activeWorkspace.context,
    status: "ready",
    supabase,
    user: {
      id: user.id,
    },
  };
}

export function getApiKeyAccessStatusCode(
  status: Exclude<ApiKeyManagementAccess["status"], "ready">,
) {
  if (status === "unauthorized") {
    return 401;
  }

  if (status === "forbidden") {
    return 403;
  }

  return 500;
}
