import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { revalidateAccountPages } from "@/lib/cache/revalidate-app";
import {
  getCurrentUserPreferences,
  normalizeUserPreferences,
} from "@/lib/profile/preferences";
import { createClient } from "@/lib/supabase/server";
import { updatePreferencesSchema } from "@/lib/validation/profile";
import type { ApiResponse } from "@/types/api";
import type { UserPreferences } from "@/types/domain";

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

function getValidationMessage(error: ZodError) {
  const fieldErrors = error.flatten().fieldErrors;
  const firstErrorMessage = Object.values(fieldErrors).flat()[0];

  return (
    (typeof firstErrorMessage === "string" ? firstErrorMessage : null) ??
    "Check your preferences and try again."
  );
}

function getPreferenceUpdateErrorMessage(errorMessage: string) {
  const normalizedMessage = errorMessage.toLowerCase();

  if (
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  ) {
    return "Your profile permissions blocked this preference update. Please apply the latest profile migration.";
  }

  if (normalizedMessage.includes("violates check constraint")) {
    return "Choose one of the supported preference options.";
  }

  return "We could not save your preferences. Please try again.";
}

export async function GET() {
  const preferences = await getCurrentUserPreferences();

  if (!preferences) {
    return jsonResponse(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Sign in to load your preferences.",
        },
        ok: false,
      },
      401,
    );
  }

  return jsonResponse<UserPreferences>({
    data: preferences,
    ok: true,
  });
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
          message: "Sign in to update your preferences.",
        },
        ok: false,
      },
      401,
    );
  }

  try {
    const payload = updatePreferencesSchema.parse(await request.json());
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          ...payload,
          id: user.id,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        },
      )
      .select(
        "timezone,date_format,time_format,week_starts_on,default_landing_page,table_density,reduce_motion,in_app_notifications_enabled",
      )
      .single<UserPreferences>();

    if (error) {
      return jsonResponse(
        {
          error: {
            code: "PREFERENCES_UPDATE_FAILED",
            details: error.message,
            message: getPreferenceUpdateErrorMessage(error.message),
          },
          ok: false,
        },
        500,
      );
    }

    revalidateAccountPages();
    revalidatePath("/settings");

    return jsonResponse<UserPreferences>({
      data: normalizeUserPreferences(data),
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
          message: "Send a valid JSON body with personal preference fields only.",
        },
        ok: false,
      },
      400,
    );
  }
}
