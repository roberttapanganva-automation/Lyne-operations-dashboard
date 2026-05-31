import { GearSixIcon, ShieldCheckIcon } from "@phosphor-icons/react/ssr";
import { Badge } from "@/components/ui/Badge";

type SettingsPageHeaderProps = {
  canManageSettings: boolean;
  role: string;
};

export function SettingsPageHeader({
  canManageSettings,
  role,
}: SettingsPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-[var(--ops-border)] bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--ops-primary-soft)] text-[var(--ops-primary-dark)]">
          <GearSixIcon aria-hidden="true" size={26} weight="duotone" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--ops-text)]">
              Settings
            </h1>
            <Badge variant={canManageSettings ? "success" : "warning"}>
              {canManageSettings ? "Owner controls" : "Personal access"}
            </Badge>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ops-text-soft)]">
            Review your account context and personal preferences. Workspace-wide
            controls stay in Owner Console.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-[var(--ops-card-soft)] px-3 py-2 text-sm font-semibold text-[var(--ops-text-soft)]">
        <ShieldCheckIcon aria-hidden="true" size={18} weight="duotone" />
        Role: {role}
      </div>
    </div>
  );
}
