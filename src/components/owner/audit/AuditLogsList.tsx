import {
  BriefcaseIcon,
  CalendarBlankIcon,
  CheckSquareIcon,
  GearSixIcon,
  KanbanIcon,
  PaletteIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react/ssr";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  buildAuditActivityLookups,
  presentAuditActivity,
} from "@/lib/activity/presentation";
import { createClient } from "@/lib/supabase/server";
import type { OwnerAuditLog } from "@/types/domain";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function AuditItemIcon({ icon }: { icon: string }) {
  const props = {
    className: "text-[var(--workspace-primary,var(--ops-primary-dark))]",
    size: 18,
    weight: "duotone" as const,
  };

  switch (icon) {
    case "lead":
      return <UsersThreeIcon aria-hidden="true" {...props} />;
    case "job":
      return <BriefcaseIcon aria-hidden="true" {...props} />;
    case "task":
      return <CheckSquareIcon aria-hidden="true" {...props} />;
    case "calendar":
      return <CalendarBlankIcon aria-hidden="true" {...props} />;
    case "branding":
      return <PaletteIcon aria-hidden="true" {...props} />;
    case "access":
      return <ShieldCheckIcon aria-hidden="true" {...props} />;
    case "team":
      return <UsersThreeIcon aria-hidden="true" {...props} />;
    case "pipeline":
      return <KanbanIcon aria-hidden="true" {...props} />;
    default:
      return <GearSixIcon aria-hidden="true" {...props} />;
  }
}

export async function AuditLogsList({ logs }: { logs: OwnerAuditLog[] }) {
  const supabase = await createClient();
  const lookups = await buildAuditActivityLookups(supabase, logs);

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="font-semibold text-[var(--ops-text)]">Audit Logs</h2>
      <p className="mt-2 text-sm text-[var(--ops-text-soft)]">
        Latest workspace audit events visible to the owner.
      </p>

      {logs.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            description="Workspace actions will appear here once audit rows exist."
            title="No audit logs yet"
          />
        </div>
      ) : (
        <div className="mt-5 divide-y divide-[var(--ops-border)] overflow-hidden rounded-lg border border-[var(--ops-border)]">
          {logs.map((log) => {
            const presentation = presentAuditActivity(log, lookups);

            return (
              <article className="bg-white p-4" key={log.id}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-3">
                    <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--workspace-primary-soft,var(--ops-primary-soft))]">
                      <AuditItemIcon icon={presentation.icon} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--ops-text)]">
                        {presentation.title}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                        {presentation.description}
                      </p>
                      <p className="mt-1 text-xs text-[var(--ops-text-muted)]">
                        {presentation.category}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--ops-text-muted)]">
                    {formatDate(log.created_at)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Card>
  );
}
