"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { BrandingAssetUploader } from "@/components/owner/branding/BrandingAssetUploader";
import { BrandingColorPicker } from "@/components/owner/branding/BrandingColorPicker";
import { BrandingPreviewCard } from "@/components/owner/branding/BrandingPreviewCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DEFAULT_BRAND } from "@/lib/branding/defaults";
import { notify } from "@/lib/ui/toast";
import { normalizeHexColor, validateHexColor } from "@/lib/validation/branding";
import type { ApiResponse } from "@/types/api";
import type { ThemeMode, WorkspaceBrandingSettings } from "@/types/domain";

export function OwnerBrandingForm({
  branding,
}: {
  branding: WorkspaceBrandingSettings | null;
}) {
  const router = useRouter();
  const [accentColor, setAccentColor] = useState(
    branding?.accent_color ?? DEFAULT_BRAND.accentColor,
  );
  const [appName, setAppName] = useState(
    branding?.app_name ?? DEFAULT_BRAND.appName,
  );
  const [error, setError] = useState<string | null>(null);
  const [iconUrl, setIconUrl] = useState(branding?.icon_url ?? null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginHeading, setLoginHeading] = useState(
    branding?.login_heading ?? "",
  );
  const [loginSubtext, setLoginSubtext] = useState(
    branding?.login_subtext ?? "",
  );
  const [logoUrl, setLogoUrl] = useState(branding?.logo_url ?? null);
  const [primaryColor, setPrimaryColor] = useState(
    branding?.primary_color ?? DEFAULT_BRAND.primaryColor,
  );
  const [success, setSuccess] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(
    branding?.theme_mode ?? "system",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);
    const normalizedPrimaryColor = normalizeHexColor(primaryColor);
    const normalizedAccentColor = normalizeHexColor(accentColor);

    if (
      !validateHexColor(normalizedPrimaryColor) ||
      !validateHexColor(normalizedAccentColor)
    ) {
      const errorMessage = `Use valid HEX colors like ${DEFAULT_BRAND.primaryColor}.`;
      setError(errorMessage);
      notify.warning("Check branding colors", errorMessage);
      setIsSubmitting(false);
      return;
    }

    const payload = {
      accent_color: normalizedAccentColor,
      app_name: appName,
      icon_url: iconUrl ?? "",
      login_heading: loginHeading,
      login_subtext: loginSubtext,
      logo_url: logoUrl ?? "",
      primary_color: normalizedPrimaryColor,
      theme_mode: themeMode,
    };

    try {
      const response = await fetch("/api/owner/branding", {
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<WorkspaceBrandingSettings>;

      if (!response.ok || !result.ok) {
        const errorMessage = result.ok
          ? "Branding update failed."
          : result.error.message;
        setError(errorMessage);
        notify.error("Branding could not be saved", errorMessage);
        return;
      }

      setPrimaryColor(normalizedPrimaryColor);
      setAccentColor(normalizedAccentColor);
      setSuccess("Workspace branding saved.");
      notify.success("Branding saved", "Workspace branding was updated.");
      router.refresh();
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "Branding update failed.";
      setError(errorMessage);
      notify.error("Branding could not be saved", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]" onSubmit={handleSubmit}>
      <Card className="space-y-5 p-5 sm:p-6">
        {error ? (
          <p
            className="rounded-lg bg-[var(--ops-danger-soft)] p-3 text-sm text-[var(--ops-danger)]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-lg bg-[var(--ops-success-soft)] p-3 text-sm text-[var(--ops-success)]">
            {success}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <BrandingAssetUploader
            assetType="logo"
            label="Workspace logo"
            onChange={setLogoUrl}
            value={logoUrl}
          />
          <BrandingAssetUploader
            assetType="icon"
            label="Workspace icon"
            onChange={setIconUrl}
            value={iconUrl}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="owner-branding-app-name"
            >
              App name
            </label>
            <input
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
              disabled={isSubmitting}
              id="owner-branding-app-name"
              onChange={(event) => setAppName(event.target.value)}
              required
              value={appName}
            />
          </div>

          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="owner-branding-theme"
            >
              Workspace default theme
            </label>
            <select
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
              disabled={isSubmitting}
              id="owner-branding-theme"
              onChange={(event) => setThemeMode(event.target.value as ThemeMode)}
              value={themeMode}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>

        <BrandingColorPicker
          accentColor={accentColor}
          disabled={isSubmitting}
          onAccentColorChange={setAccentColor}
          onPrimaryColorChange={setPrimaryColor}
          primaryColor={primaryColor}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="owner-branding-login-heading"
            >
              Login heading
            </label>
            <input
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
              disabled={isSubmitting}
              id="owner-branding-login-heading"
              onChange={(event) => setLoginHeading(event.target.value)}
              value={loginHeading}
            />
          </div>
          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="owner-branding-login-subtext"
            >
              Login subtext
            </label>
            <input
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
              disabled={isSubmitting}
              id="owner-branding-login-subtext"
              onChange={(event) => setLoginSubtext(event.target.value)}
              value={loginSubtext}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving..." : "Save branding"}
          </Button>
        </div>
      </Card>

      <BrandingPreviewCard
        accentColor={accentColor}
        appName={appName}
        iconUrl={iconUrl}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
      />
    </form>
  );
}
