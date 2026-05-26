import Link from "next/link";
import { PreferencesForm } from "@/components/settings/PreferencesForm";
import { RestrictedSettingsState } from "@/components/settings/RestrictedSettingsState";
import { SecuritySettingsPlaceholder } from "@/components/settings/SecuritySettingsPlaceholder";
import { SettingsPageHeader } from "@/components/settings/SettingsPageHeader";
import { TeamVisibility } from "@/components/settings/TeamVisibility";
import { Card } from "@/components/ui/Card";
import { getCurrentUserPreferences } from "@/lib/profile/preferences";
import { getSettingsForActiveWorkspace } from "@/lib/settings/queries";

export default async function SettingsPage() {
  const [preferences, settings] = await Promise.all([
    getCurrentUserPreferences(),
    getSettingsForActiveWorkspace(),
  ]);

  if (!settings) {
    return (
      <div className="space-y-5">
        {preferences ? <PreferencesForm preferences={preferences} /> : null}
        <Card className="p-6">
          <h1 className="text-lg font-semibold text-[var(--ops-text)]">
            Settings unavailable
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--ops-text-soft)]">
            We could not load settings for the active workspace.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <SettingsPageHeader
        canManageSettings={settings.canManageSettings}
        role={settings.currentUserRole}
      />

      {preferences ? <PreferencesForm preferences={preferences} /> : null}

      {settings.currentUserRole === "owner" ? (
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[var(--ops-text)]">
            Workspace controls stay in Owner Console.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ops-text-soft)]">
            Use Owner Console for branding, modules, pipeline configuration,
            access rules, audit logs, assignments, invitations, and team
            management. Personal preferences remain here on your account.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--ops-primary)] px-4 text-sm font-semibold text-white shadow-[0_12px_28px_var(--ops-primary-glow)] transition hover:bg-[var(--ops-primary-dark)]"
              href="/owner"
            >
              Open Owner Console
            </Link>
            <Link
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--ops-border-strong)] bg-white px-4 text-sm font-semibold text-[var(--ops-text)] transition hover:bg-[var(--ops-card-soft)]"
              href="/owner/branding"
            >
              Open Owner Branding
            </Link>
          </div>
        </Card>
      ) : !settings.canViewSettings ? (
        <RestrictedSettingsState />
      ) : (
        <>
          <Card className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-[var(--ops-text)]">
              Workspace settings boundary
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ops-text-soft)]">
              Branding, modules, pipeline structure, access rules, and audit
              controls are managed in Owner Console. This page is limited to
              personal preferences and role-appropriate account context.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--ops-primary)] px-4 text-sm font-semibold text-white shadow-[0_12px_28px_var(--ops-primary-glow)] transition hover:bg-[var(--ops-primary-dark)]"
                href="/pipelines"
              >
                Open Pipelines
              </Link>
            </div>
          </Card>

          {settings.canViewMemberVisibility ? (
            <TeamVisibility members={settings.teamMembers} />
          ) : null}

          <SecuritySettingsPlaceholder />
        </>
      )}
    </div>
  );
}
