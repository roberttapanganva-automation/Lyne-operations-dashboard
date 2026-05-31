import { NextResponse } from "next/server";
import { revalidateAccountPages } from "@/lib/cache/revalidate-app";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getThemePreference } from "@/lib/theme/getThemePreference";
import { updateThemeModeSchema } from "@/lib/validation/profile";
import type { ApiResponse } from "@/types/api";
import type { ThemeMode, UserThemePreference } from "@/types/domain";

type ThemePreferenceUpdateResponse = UserThemePreference & {
  theme_mode: ThemeMode;
};

function jsonResponse<T>(body: ApiResponse<T>, status = 200) {
  return NextResponse.json(body, { status });
}

function getThemeUpdateErrorMessage(errorMessage: string) {
  const normalizedMessage = errorMessage.toLowerCase();

  if (
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("row-level security")
  ) {
    return "Your profile permissions blocked the theme update. Please apply the latest profile access migration.";
  }

  if (normalizedMessage.includes("violates check constraint")) {
    return "Choose System, Light, or Dark.";
  }

  return "We could not save your theme preference. Please try again.";
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
          code: "not_authenticated",
          message: "Sign in to update your theme preference.",
        },
        ok: false,
      },
      401,
    );
  }

  try {
    const payload = updateThemeModeSchema.parse(await request.json());
    const { data: profile, error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          theme_mode: payload.theme_mode,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        },
      )
      .select("theme_mode")
      .single<{ theme_mode: ThemeMode }>();

    if (error) {
      return jsonResponse(
        {
          error: {
            code: "profile_update_failed",
            message: getThemeUpdateErrorMessage(error.message),
            details: error.message,
          },
          ok: false,
        },
        500,
      );
    }

    revalidateAccountPages();

    const preference = await getThemePreference();

    return jsonResponse<ThemePreferenceUpdateResponse>({
      data: {
        ...preference,
        theme_mode: profile.theme_mode,
      },
      ok: true,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(
        {
          error: {
            code: "invalid_theme_mode",
            message: "Send only theme_mode with System, Light, or Dark.",
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
          code: "invalid_theme_mode",
          message: "Send a valid JSON body with theme_mode set to system, light, or dark.",
        },
        ok: false,
      },
      400,
    );
  }
}
