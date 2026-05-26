import { ArrowLeftIcon, ShieldWarningIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

export function RestrictedSettingsState() {
  return (
    <Card className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
        <div className="p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--ops-warning-soft)] text-[var(--ops-warning)]">
            <ShieldWarningIcon aria-hidden="true" size={26} weight="duotone" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-normal text-[var(--ops-text)]">
            Workspace settings are restricted.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ops-text-soft)]">
            Personal preferences still live on your account. Workspace-wide
            branding, modules, pipeline configuration, and access controls stay
            in Owner Console.
          </p>
          <Link
            className="mt-6 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--ops-primary)] px-4 text-sm font-semibold text-white shadow-[0_12px_28px_var(--ops-primary-glow)] transition hover:bg-[var(--ops-primary-dark)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ops-primary)]"
            href="/dashboard"
          >
            <ArrowLeftIcon aria-hidden="true" size={18} weight="regular" />
            Back to Dashboard
          </Link>
        </div>
        <div className="border-t border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-6 lg:border-l lg:border-t-0">
          <p className="text-sm font-semibold text-[var(--ops-text)]">
            Access model
          </p>
          <div className="mt-4 space-y-3 text-sm text-[var(--ops-text-soft)]">
            <p>Owners manage workspace-wide controls in Owner Console.</p>
            <p>All authenticated roles manage their own preferences from the account surface.</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
