import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { updateAccountProfileSchema } from "@/lib/validation/profile";
import type { ApiResponse } from "@/types/api";

type ProfileResponse = {
  avatar_url: string | null;
  full_name: string | null;
  timezone: string;
};

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

function getValidationMessage(error: ZodError) {
  const fieldErrors = error.flatten().fieldErrors;
  const firstErrorMessage = Object.values(fieldErrors).flat()[0];

  return (
    (typeof firstErrorMessage === "string" ? firstErrorMessage : null) ??
    "Profile could not be saved. Check your account details and try again."
  );
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonResponse(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Sign in to update your profile.",
        },
        ok: false,
      },
      401,
    );
  }

  try {
    const payload = updateAccountProfileSchema.parse(await request.json());
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          full_name: payload.full_name ?? null,
          id: user.id,
          timezone: payload.timezone,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        },
      )
      .select("full_name,avatar_url,timezone")
      .single<ProfileResponse>();

    if (error) {
      return jsonResponse(
        {
          error: {
            code: "PROFILE_UPDATE_FAILED",
            details: error.message,
            message: "Profile could not be saved.",
          },
          ok: false,
        },
        500,
      );
    }

    return jsonResponse({
      data,
      ok: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            details: error.flatten().fieldErrors,
            message: getValidationMessage(error),
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
          message: "Profile could not be saved.",
        },
        ok: false,
      },
      400,
    );
  }
}
