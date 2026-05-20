import { GearSixIcon, GlobeHemisphereWestIcon } from "@phosphor-icons/react/ssr";
import { AccountActivityCard } from "@/components/account/AccountActivityCard";
import { AccountAvatarCard } from "@/components/account/AccountAvatarCard";
import { AccountProfileForm } from "@/components/account/AccountProfileForm";
import { AccountSecurityCard } from "@/components/account/AccountSecurityCard";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCurrentAccountSummary } from "@/lib/account/queries";

function formatRoleLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}

function formatStatusLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default async function AccountPage() {
  const account = await getCurrentAccountSummary();

  if (!account) {
    return (
      <Card className="p-6">
        <EmptyState
          description="Sign in again to load your personal account details."
          title="Account unavailable"
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-[var(--workspace-primary,var(--ops-primary))]">
            Personal profile
          </p>
          <h1 className="text-2xl font-semibold text-[var(--ops-text)]">
            Account
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--ops-text-soft)]">
            Manage your profile, avatar, preferences, and workspace access.
          </p>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="space-y-5">
          <AccountAvatarCard
            avatarUrl={account.avatarUrl}
            displayName={account.displayName}
            email={account.email}
            fullName={account.fullName}
          />
          <AccountProfileForm
            email={account.email}
            fullName={account.fullName}
            timezone={account.timezone}
          />
        </div>

        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ops-primary-soft)] text-[var(--workspace-primary,var(--ops-primary-dark))]">
                <GearSixIcon aria-hidden="true" size={20} weight="duotone" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-[var(--ops-text)]">
                  Preferences
                </h2>
                <p className="mt-1 text-sm leading-6 text-[var(--ops-text-soft)]">
                  Your current timezone is <span className="font-medium text-[var(--ops-text)]">{account.timezone}</span>. More personal preferences will be added later.
                </p>
              </div>
            </div>
          </Card>

          <AccountSecurityCard email={account.email} />

          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ops-info-soft)] text-[var(--ops-info)]">
                <GlobeHemisphereWestIcon
                  aria-hidden="true"
                  size={20}
                  weight="duotone"
                />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-[var(--ops-text)]">
                  Workspace access
                </h2>
                <p className="mt-1 text-sm text-[var(--ops-text-soft)]">
                  Your current role and active workspace context.
                </p>
              </div>
            </div>

            {account.workspaceAccess ? (
              <div className="mt-5 space-y-3 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                    Active workspace
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[var(--ops-text)]">
                    {account.workspaceAccess.name}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      Role
                    </p>
                    <p className="mt-1 text-sm text-[var(--ops-text)]">
                      {formatRoleLabel(account.workspaceAccess.role)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ops-text-muted)]">
                      Membership status
                    </p>
                    <p className="mt-1 text-sm text-[var(--ops-text)]">
                      {formatStatusLabel(account.workspaceAccess.status)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                <EmptyState
                  description="Workspace membership details are not available for this account yet."
                  title="No workspace access loaded"
                />
              </div>
            )}
          </Card>

          <AccountActivityCard activity={account.activity} />
        </div>
      </div>
    </div>
  );
}
