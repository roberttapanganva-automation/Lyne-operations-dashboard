import Link from "next/link";
import {
  CheckCircleIcon,
  GearSixIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  UserPlusIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr";
import { DangerZonePlaceholder } from "@/components/owner/DangerZonePlaceholder";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  buildAuditActivityLookups,
  presentAuditActivity,
} from "@/lib/activity/presentation";
import { createClient } from "@/lib/supabase/server";
import { getOwnerConsoleOverview } from "@/lib/owner/queries";

const cards = [
  { key: "memberCount", label: "Members", href: "/owner/team", Icon: UsersThreeIcon },
  { key: "pendingInvitationCount", label: "Pending Invites", href: "/owner/invitations", Icon: UserPlusIcon },
  { key: "enabledModuleCount", label: "Enabled Modules", href: "/owner/modules", Icon: SlidersHorizontalIcon },
  { key: "rolePermissionCount", label: "Access Rules", href: "/owner/access-rules", Icon: ShieldCheckIcon },
] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function OwnerOverviewPage() {
  const overview = await getOwnerConsoleOverview();
  const supabase = await createClient();

  if (!overview) {
    return null;
  }

  const auditLookups = await buildAuditActivityLookups(
    supabase,
    overview.latestAuditLogs,
  );

  const setupItems = [
    {
      key: "branding",
      label: "Branding",
      ok: overview.brandingFullyConfigured,
      doneLabel: "Configured",
      pendingLabel: "Needs setup",
    },
    {
      key: "modules",
      label: "Modules",
      ok: overview.enabledModuleCount > 0,
      doneLabel: "Enabled",
      pendingLabel: "Needs setup",
    },
    {
      key: "pipeline",
      label: "Pipeline",
      ok: overview.pipelineGroupCount > 0 && overview.pipelineStageCount > 0,
      doneLabel: "Ready",
      pendingLabel: "Needs setup",
    },
    {
      key: "access-rules",
      label: "Access Rules",
      ok: overview.accessRulesConfigured,
      doneLabel: "Active",
      pendingLabel: "Needs setup",
    },
    {
      key: "team",
      label: "Team",
      ok: overview.teamReady,
      doneLabel: "Ready",
      pendingLabel: "Needs invite",
    },
  ] as const;
  const setupCompleted = setupItems.filter((item) => item.ok).length;
  const setupProgress = Math.round((setupCompleted / setupItems.length) * 100);

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="rounded-xl border border-[var(--ops-border)] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-sm font-semibold text-[var(--ops-primary-dark)]">
          Owner Console
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--ops-text)] sm:text-3xl">
          Workspace ownership controls
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--ops-text-soft)]">
          Control workspace branding, roles, permissions, modules, and business-level configuration.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.Icon;
          return (
            <Link href={card.href} key={card.key}>
              <Card className="p-5 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-[var(--ops-text-soft)]">
                      {card.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[var(--ops-text)]">
                      {overview[card.key]}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--ops-primary-soft)] text-[var(--ops-primary-dark)]">
                    <Icon aria-hidden="true" size={24} weight="duotone" />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-[var(--ops-text)]">
                Recent Audit Logs
              </h2>
              <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                Latest real audit events from this workspace.
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--ops-card-soft)] text-[#7B8794]">
              <svg
                aria-hidden="true"
                className="h-6 w-6 fill-current"
                viewBox="0 0 256 256"
              >
                <path d="M136,80v43.47l36.12,21.67a8,8,0,0,1-8.24,13.72l-40-24A8,8,0,0,1,120,128V80a8,8,0,0,1,16,0Zm-8-48A95.44,95.44,0,0,0,60.08,60.15C52.81,67.51,46.35,74.59,40,82V64a8,8,0,0,0-16,0v40a8,8,0,0,0,8,8H72a8,8,0,0,0,0-16H49c7.15-8.42,14.27-16.35,22.39-24.57a80,80,0,1,1,1.66,114.75,8,8,0,1,0-11,11.64A96,96,0,1,0,128,32Z" />
              </svg>
            </div>
          </div>
          {overview.latestAuditLogs.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                description="Audit rows will appear here after workspace actions are recorded."
                title="No audit logs yet"
              />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {overview.latestAuditLogs.map((log) => (
                (() => {
                  const presentation = presentAuditActivity(log, auditLookups);

                  return (
                    <div
                      className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4"
                      key={log.id}
                    >
                      <p className="font-semibold text-[var(--ops-text)]">
                        {presentation.title}
                      </p>
                      <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                        {presentation.description}
                      </p>
                      <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                        {formatDate(log.created_at)}
                      </p>
                    </div>
                  );
                })()
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--ops-primary-soft)] text-[var(--ops-primary-dark)]">
              <GearSixIcon aria-hidden="true" size={22} weight="duotone" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--ops-text)]">
                Workspace Setup Health
              </h2>
              <p className="text-sm text-[var(--ops-text-soft)]">
                Readiness for team operations.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <p className="text-sm font-medium text-[var(--ops-text)]">
                {setupCompleted}/{setupItems.length} complete
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--ops-card-soft)]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,var(--workspace-primary),var(--workspace-accent))] transition-all"
                  style={{ width: `${setupProgress}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              {setupItems.map((item) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-3 py-2"
                  key={item.key}
                >
                  <p className="text-sm text-[var(--ops-text)]">{item.label}</p>
                  <Badge variant={item.ok ? "success" : "warning"}>
                    {item.ok ? item.doneLabel : item.pendingLabel}
                  </Badge>
                </div>
              ))}
            </div>
            <Link
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ops-primary-dark)] hover:text-[var(--workspace-accent)]"
              href="/owner/branding"
            >
              <CheckCircleIcon aria-hidden="true" size={16} weight="duotone" />
              Continue setup
            </Link>
          </div>
        </Card>
      </section>

      <DangerZonePlaceholder />
    </div>
  );
}
