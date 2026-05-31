import { createClient } from "@/lib/supabase/server";
import type { UserPreferences } from "@/types/domain";

type PreferencesProfileRow = Partial<UserPreferences>;

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  date_format: "MMM d, yyyy",
  default_landing_page: "/dashboard",
  in_app_notifications_enabled: true,
  reduce_motion: false,
  table_density: "comfortable",
  time_format: "12h",
  timezone: "UTC",
  week_starts_on: "monday",
};

export function normalizeUserPreferences(
  preferences: PreferencesProfileRow | null | undefined,
): UserPreferences {
  return {
    date_format: preferences?.date_format ?? DEFAULT_USER_PREFERENCES.date_format,
    default_landing_page:
      preferences?.default_landing_page ??
      DEFAULT_USER_PREFERENCES.default_landing_page,
    in_app_notifications_enabled:
      preferences?.in_app_notifications_enabled ??
      DEFAULT_USER_PREFERENCES.in_app_notifications_enabled,
    reduce_motion:
      preferences?.reduce_motion ?? DEFAULT_USER_PREFERENCES.reduce_motion,
    table_density:
      preferences?.table_density ?? DEFAULT_USER_PREFERENCES.table_density,
    time_format: preferences?.time_format ?? DEFAULT_USER_PREFERENCES.time_format,
    timezone: preferences?.timezone ?? DEFAULT_USER_PREFERENCES.timezone,
    week_starts_on:
      preferences?.week_starts_on ?? DEFAULT_USER_PREFERENCES.week_starts_on,
  };
}

export async function getCurrentUserPreferences(): Promise<UserPreferences | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from("profiles")
    .select(
      "timezone,date_format,time_format,week_starts_on,default_landing_page,table_density,reduce_motion,in_app_notifications_enabled",
    )
    .eq("id", user.id)
    .maybeSingle<PreferencesProfileRow>();

  return normalizeUserPreferences(data);
}
