import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { getEffectiveRolePermission } from "@/lib/permissions/effective";
import {
  canCreateOperationalRecords,
  canDeleteOperationalRecords,
} from "@/lib/permissions/workspace";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspace } from "@/lib/tenant/getActiveWorkspace";
import { createAppointmentSchema } from "@/lib/validation/appointments";
import type { ApiResponse } from "@/types/api";

type AppointmentResponse = {
  client_id: string | null;
  clients?: {
    email: string | null;
    name: string;
  } | null;
  created_at: string;
  ends_at: string | null;
  id: string;
  job_id: string | null;
  location: string | null;
  notes: string | null;
  starts_at: string;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  title: string;
};

const deleteAppointmentsSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(200),
});

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
          message: "Sign in to view appointments.",
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
    .from("appointments")
    .select(
      "id,client_id,job_id,title,starts_at,ends_at,location,status,notes,created_at,clients(name,email)",
    )
    .eq("workspace_id", activeWorkspace.context.workspace.id)
    .order("starts_at", { ascending: true })
    .returns<AppointmentResponse[]>();

  if (error) {
    return jsonResponse(
      {
        error: {
          code: "APPOINTMENTS_LOAD_FAILED",
          message: "We could not load appointments. Please try again.",
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
          message: "Sign in to create appointments.",
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
    rolePermission?.can_create_appointments === false
  ) {
    return jsonResponse(
      {
        error: {
          code: "APPOINTMENT_CREATE_FORBIDDEN",
          message: "Your workspace role cannot create appointments.",
        },
        ok: false,
      },
      403,
    );
  }

  try {
    const payload = createAppointmentSchema.parse(await request.json());
    const workspaceId = activeWorkspace.context.workspace.id;

    let clientId: string | null = null;

    if (payload.client_id) {
      const { data: linkedClient, error: clientLookupError } = await supabase
        .from("clients")
        .select("id")
        .eq("id", payload.client_id)
        .eq("workspace_id", workspaceId)
        .maybeSingle<{ id: string }>();

      if (clientLookupError || !linkedClient) {
        return jsonResponse(
          {
            error: {
              code: "CLIENT_LINK_FAILED",
              message:
                "The selected client is not available in this workspace.",
              details: clientLookupError?.message,
            },
            ok: false,
          },
          400,
        );
      }

      clientId = linkedClient.id;
    } else if (payload.client_name) {
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .insert({
          created_by: user.id,
          email: payload.client_email ?? null,
          name: payload.client_name,
          phone: payload.client_phone ?? null,
          source: "appointment",
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
              message:
                "We could not create the appointment contact. Please try again.",
              details: clientError.message,
            },
            ok: false,
          },
          500,
        );
      }

      clientId = client.id;
    }

    if (payload.job_id) {
      const { data: linkedJob, error: jobError } = await supabase
        .from("jobs")
        .select("id")
        .eq("id", payload.job_id)
        .eq("workspace_id", workspaceId)
        .maybeSingle<{ id: string }>();

      if (jobError || !linkedJob) {
        return jsonResponse(
          {
            error: {
              code: "JOB_LINK_FAILED",
              message: "The selected job is not available in this workspace.",
              details: jobError?.message,
            },
            ok: false,
          },
          400,
        );
      }
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        client_id: clientId,
        created_by: user.id,
        ends_at: payload.ends_at ?? null,
        job_id: payload.job_id ?? null,
        location: payload.location ?? null,
        notes: payload.notes ?? null,
        starts_at: payload.starts_at,
        status: payload.status,
        title: payload.title,
        updated_by: user.id,
        workspace_id: workspaceId,
      })
      .select(
        "id,client_id,job_id,title,starts_at,ends_at,location,status,notes,created_at",
      )
      .single<AppointmentResponse>();

    if (appointmentError) {
      return jsonResponse(
        {
          error: {
            code: "APPOINTMENT_CREATE_FAILED",
            message: "We could not create the appointment. Please try again.",
            details: appointmentError.message,
          },
          ok: false,
        },
        500,
      );
    }

    await supabase.from("audit_logs").insert({
      action: "appointment.created",
      actor_user_id: user.id,
      entity_id: appointment.id,
      entity_type: "appointment",
      metadata: {
        starts_at: appointment.starts_at,
        title: appointment.title,
      },
      workspace_id: workspaceId,
    });

    return jsonResponse(
      {
        data: appointment,
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
            message: "Check the appointment details and try again.",
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
          message:
            "We could not read the appointment details. Please try again.",
        },
        ok: false,
      },
      400,
    );
  }
}

export async function DELETE(request: Request) {
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
          message: "Sign in to delete appointments.",
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

  if (!canDeleteOperationalRecords(activeWorkspace.context.role)) {
    return jsonResponse(
      {
        error: {
          code: "APPOINTMENT_DELETE_FORBIDDEN",
          message: "Your workspace role cannot delete appointments.",
        },
        ok: false,
      },
      403,
    );
  }

  try {
    const payload = deleteAppointmentsSchema.parse(await request.json());
    const workspaceId = activeWorkspace.context.workspace.id;
    const ids = [...new Set(payload.ids)];
    const { data: availableAppointments, error: availableError } =
      await supabase
        .from("appointments")
        .select("id,title")
        .eq("workspace_id", workspaceId)
        .in("id", ids)
        .returns<{ id: string; title: string }[]>();

    if (availableError) {
      return jsonResponse(
        {
          error: {
            code: "APPOINTMENTS_LOOKUP_FAILED",
            message: "We could not verify the selected appointments.",
            details: availableError.message,
          },
          ok: false,
        },
        500,
      );
    }

    if ((availableAppointments ?? []).length !== ids.length) {
      return jsonResponse(
        {
          error: {
            code: "APPOINTMENTS_SCOPE_MISMATCH",
            message:
              "Some selected appointments are not available in this workspace.",
          },
          ok: false,
        },
        400,
      );
    }

    const { data: appointments, error: appointmentError } = await supabase
      .from("appointments")
      .delete()
      .in("id", ids)
      .eq("workspace_id", workspaceId)
      .select("id,title")
      .returns<{ id: string; title: string }[]>();

    if (appointmentError) {
      return jsonResponse(
        {
          error: {
            code: "APPOINTMENTS_DELETE_FAILED",
            message:
              "We could not delete the selected appointments. Please try again.",
            details: appointmentError.message,
          },
          ok: false,
        },
        500,
      );
    }

    await supabase.from("audit_logs").insert({
      action: "appointment.bulk_deleted",
      actor_user_id: user.id,
      entity_id: null,
      entity_type: "appointment",
      metadata: {
        count: appointments?.length ?? 0,
        ids: appointments?.map((appointment) => appointment.id) ?? [],
      },
      workspace_id: workspaceId,
    });

    return jsonResponse({
      data: {
        ids: appointments?.map((appointment) => appointment.id) ?? [],
      },
      ok: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Select at least one valid appointment to delete.",
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
          message:
            "We could not read the appointment selection. Please try again.",
        },
        ok: false,
      },
      400,
    );
  }
}
