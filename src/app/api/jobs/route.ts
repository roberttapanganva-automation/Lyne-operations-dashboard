import { after, NextResponse } from "next/server";
import { revalidateJobPages } from "@/lib/cache/revalidate-app";
import { ZodError } from "zod";
import {
  getAssignableMember,
  getAssignmentFields,
} from "@/lib/assignments/engine";
import { getEffectiveRolePermission } from "@/lib/permissions/effective";
import {
  canAssignOperationalRecords,
  canCreateOperationalRecords,
} from "@/lib/permissions/workspace";
import { triggerAutomationForWorkspace } from "@/lib/n8n/client";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { createJobSchema } from "@/lib/validation/jobs";
import type { ApiResponse } from "@/types/api";
import type { AssignableWorkspaceMember } from "@/types/domain";

type JobResponse = {
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
  payment_status: "unpaid" | "partial" | "paid" | "refunded" | "not_applicable";
  scheduled_end: string | null;
  scheduled_start: string | null;
  service_type: string | null;
  status: "draft" | "scheduled" | "in_progress" | "completed" | "cancelled";
  title: string;
};

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

function getStatusForWorkspaceResult(
  status: "no-user" | "no-workspace" | "error",
) {
  if (status === "no-user") {
    return 401;
  }

  if (status === "no-workspace") {
    return 403;
  }

  return 500;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Sign in to view jobs.",
        },
        ok: false,
      },
      401,
    );
  }

  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return jsonResponse(
      {
        error: {
          code: "NO_ACTIVE_WORKSPACE",
          message:
            activeWorkspace.error ??
            "No active workspace is available for this account.",
        },
        ok: false,
      },
      getStatusForWorkspaceResult(activeWorkspace.status),
    );
  }

  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id,assigned_member_id,client_id,title,service_type,scheduled_start,scheduled_end,location,estimated_value,payment_status,status,created_at,clients(name,email)",
    )
    .eq("workspace_id", activeWorkspace.context.workspace.id)
    .order("created_at", { ascending: false })
    .returns<JobResponse[]>();

  if (error) {
    return jsonResponse(
      {
        error: {
          code: "JOBS_LOAD_FAILED",
          message: "We could not load jobs. Please try again.",
          details: error.message,
        },
        ok: false,
      },
      500,
    );
  }

  return jsonResponse({
    data: data ?? [],
    ok: true,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonResponse(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Sign in to create jobs.",
        },
        ok: false,
      },
      401,
    );
  }

  const activeWorkspace = await getActiveWorkspace();

  if (activeWorkspace.status !== "ready") {
    return jsonResponse(
      {
        error: {
          code: "NO_ACTIVE_WORKSPACE",
          message:
            activeWorkspace.error ??
            "No active workspace is available for this account.",
        },
        ok: false,
      },
      getStatusForWorkspaceResult(activeWorkspace.status),
    );
  }

  const rolePermission = await getEffectiveRolePermission({
    role: activeWorkspace.context.role,
    supabase,
    workspaceId: activeWorkspace.context.workspace.id,
  });

  if (
    !canCreateOperationalRecords(activeWorkspace.context.role) ||
    rolePermission?.can_create_jobs === false
  ) {
    return jsonResponse(
      {
        error: {
          code: "JOB_CREATE_FORBIDDEN",
          message: "Your workspace role cannot create jobs.",
        },
        ok: false,
      },
      403,
    );
  }

  try {
    const payload = createJobSchema.parse(await request.json());
    const workspaceId = activeWorkspace.context.workspace.id;
    const requestedAssignedMemberId = payload.assigned_member_id ?? null;
    let assignedMember: AssignableWorkspaceMember | null = null;

    let clientId: string | null = null;

    if (requestedAssignedMemberId) {
      if (!canAssignOperationalRecords(activeWorkspace.context.role)) {
        return jsonResponse(
          {
            error: {
              code: "JOB_ASSIGN_FORBIDDEN",
              message: "Your workspace role cannot assign jobs.",
            },
            ok: false,
          },
          403,
        );
      }

      assignedMember = await getAssignableMember({
        memberId: requestedAssignedMemberId,
        supabase,
        workspaceId,
      });

      if (!assignedMember) {
        return jsonResponse(
          {
            error: {
              code: "JOB_ASSIGNEE_INVALID",
              message:
                "Choose an active admin, manager, or staff member from this workspace.",
            },
            ok: false,
          },
          400,
        );
      }
    }

    if (payload.client_name) {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          created_by: user.id,
          email: payload.client_email ?? null,
          name: payload.client_name,
          phone: payload.client_phone ?? null,
          source: "job",
          updated_by: user.id,
          workspace_id: workspaceId,
        })
        .select("id")
        .single<{ id: string }>();

      if (clientError) {
        return jsonResponse(
          {
            error: {
              code: "CLIENT_CREATE_FAILED",
              message: "We could not create the job contact. Please try again.",
              details: clientError.message,
            },
            ok: false,
          },
          500,
        );
      }

      clientId = client.id;
    }

    if (payload.lead_id) {
      const { data: linkedLead, error: leadError } = await supabase
        .from("leads")
        .select("id")
        .eq("id", payload.lead_id)
        .eq("workspace_id", workspaceId)
        .maybeSingle<{ id: string }>();

      if (leadError || !linkedLead) {
        return jsonResponse(
          {
            error: {
              code: "LEAD_LINK_FAILED",
              message: "The selected lead is not available in this workspace.",
              details: leadError?.message,
            },
            ok: false,
          },
          400,
        );
      }
    }

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({
        actual_value: payload.actual_value ?? null,
        ...getAssignmentFields({
          actorUserId: user.id,
          assignedMember,
          targetType: "job",
        }),
        client_id: clientId,
        created_by: user.id,
        estimated_value: payload.estimated_value,
        lead_id: payload.lead_id ?? null,
        location: payload.location ?? null,
        notes: payload.notes ?? null,
        payment_status: payload.payment_status,
        scheduled_end: payload.scheduled_end ?? null,
        scheduled_start: payload.scheduled_start ?? null,
        service_type: payload.service_type ?? null,
        status: payload.status,
        title: payload.title,
        updated_by: user.id,
        workspace_id: workspaceId,
      })
      .select(
        "id,assigned_member_id,client_id,title,service_type,scheduled_start,scheduled_end,location,estimated_value,payment_status,status,created_at,clients(name,email)",
      )
      .single<JobResponse>();

    if (jobError) {
      return jsonResponse(
        {
          error: {
            code: "JOB_CREATE_FAILED",
            message: "We could not create the job. Please try again.",
            details: jobError.message,
          },
          ok: false,
        },
        500,
      );
    }

    await supabase.from("audit_logs").insert({
      action: "job.created",
      actor_user_id: user.id,
      entity_id: job.id,
      entity_type: "job",
      metadata: {
        title: job.title,
      },
      workspace_id: workspaceId,
    });

    revalidateJobPages();

    if (assignedMember) {
      after(() =>
        triggerAutomationForWorkspace({
          automationType: "job.assigned",
          payload: {
            assigned_member_id: assignedMember.id,
          },
          relatedId: job.id,
          relatedType: "job",
          supabase,
          workspaceId,
        }),
      );
    }

    return jsonResponse(
      {
        data: {
          ...job,
          assigned_member: assignedMember,
        },
        ok: true,
      },
      201,
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Check the job details and try again.",
            details: error.flatten().fieldErrors,
          },
          ok: false,
        },
        400,
      );
    }

    return jsonResponse(
      {
        error: {
          code: "BAD_REQUEST",
          message: "We could not read the job details. Please try again.",
        },
        ok: false,
      },
      400,
    );
  }
}
