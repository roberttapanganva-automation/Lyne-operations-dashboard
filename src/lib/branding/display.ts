import { DEFAULT_BRAND } from "@/lib/branding/defaults";

type BrandingDisplayInput = {
  branding: {
    app_name?: string | null;
    icon_url?: string | null;
    logo_url?: string | null;
  } | null;
  workspaceName?: string | null;
};

export function getWorkspaceDisplayName({
  branding,
}: BrandingDisplayInput) {
  const appName = branding?.app_name?.trim();
  if (appName) {
    return appName;
  }

  return DEFAULT_BRAND.appName;
}

export function getWorkspaceIconUrl({ branding }: BrandingDisplayInput) {
  return (
    branding?.icon_url?.trim() ||
    branding?.logo_url?.trim() ||
    DEFAULT_BRAND.iconUrl
  );
}

export function getWorkspaceLogoUrl({ branding }: BrandingDisplayInput) {
  return branding?.logo_url?.trim() || null;
}

export function getWorkspaceSubtitle() {
  return DEFAULT_BRAND.subtitle;
}
