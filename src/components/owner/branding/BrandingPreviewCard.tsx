"use client";

import { DEFAULT_BRAND } from "@/lib/branding/defaults";
import { getWorkspaceDisplayName, getWorkspaceIconUrl } from "@/lib/branding/display";

type BrandingPreviewCardProps = {
  accentColor: string;
  appName: string;
  iconUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
};

export function BrandingPreviewCard({
  accentColor,
  appName,
  iconUrl,
  logoUrl,
  primaryColor,
}: BrandingPreviewCardProps) {
  const displayName = getWorkspaceDisplayName({
    branding: {
      app_name: appName,
      icon_url: iconUrl,
      logo_url: logoUrl,
    },
  });
  const resolvedIconUrl = getWorkspaceIconUrl({
    branding: {
      app_name: appName,
      icon_url: iconUrl,
      logo_url: logoUrl,
    },
  });

  return (
    <div className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-card)] p-4">
      <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
        Branding preview
      </p>
      <div className="mt-4 overflow-hidden rounded-xl border border-[var(--ops-border)]">
        <div className="flex min-h-36">
          <aside
            className="hidden w-28 shrink-0 p-4 sm:block"
            style={{ backgroundColor: DEFAULT_BRAND.darkColor }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-[var(--ops-sidebar-card)] shadow-[0_8px_24px_var(--ops-primary-glow)]"
            >
              {resolvedIconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={`${displayName} icon`}
                  className="h-full w-full object-contain"
                  src={resolvedIconUrl}
                />
              ) : (
                <span className="text-sm font-bold text-white">Ly</span>
              )}
            </div>
            <div className="mt-5 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
            <div className="mt-3 h-2 rounded-full bg-white/20" />
            <div className="mt-3 h-2 rounded-full bg-white/20" />
          </aside>
          <section className="min-w-0 flex-1 bg-[var(--ops-card-soft)] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-[#13223d]">
                {resolvedIconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={`${displayName} icon`}
                    className="h-full w-full object-contain"
                    src={resolvedIconUrl}
                  />
                ) : (
                  <span className="text-sm font-bold text-white">Ly</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--ops-text)]">
                  {displayName}
                </p>
                <p className="text-sm text-[var(--ops-text-soft)]">
                  {DEFAULT_BRAND.subtitle}
                </p>
              </div>
            </div>
            <div className="mt-5 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] p-4">
              <div className="h-2 w-24 rounded-full" style={{ backgroundColor: accentColor }} />
              <div className="mt-4 h-8 w-32 rounded-lg" style={{ backgroundColor: primaryColor }} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
