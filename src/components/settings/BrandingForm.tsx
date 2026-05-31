"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import type { CSSProperties } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DEFAULT_BRAND } from "@/lib/branding/defaults";
import {
  normalizeHexColor,
  validateHexColor,
} from "@/lib/validation/branding";
import { notify } from "@/lib/ui/toast";
import type { ApiResponse } from "@/types/api";
import type { WorkspaceBrandingSettings } from "@/types/domain";

type BrandingFormProps = {
  branding: WorkspaceBrandingSettings | null;
  canManageSettings: boolean;
};

type BrandingResponse = Record<string, unknown>;

const DEFAULT_APP_NAME = DEFAULT_BRAND.appName;
const DEFAULT_PRIMARY_COLOR = DEFAULT_BRAND.primaryColor;
const DEFAULT_ACCENT_COLOR = DEFAULT_BRAND.accentColor;

function getErrorMessage(response: ApiResponse<BrandingResponse>) {
  return response.ok ? null : response.error.message;
}

export function BrandingForm({
  branding,
  canManageSettings,
}: BrandingFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(
    branding?.primary_color ?? DEFAULT_PRIMARY_COLOR,
  );
  const [accentColor, setAccentColor] = useState(
    branding?.accent_color ?? DEFAULT_ACCENT_COLOR,
  );
  const [appName, setAppName] = useState(branding?.app_name ?? DEFAULT_APP_NAME);
  const [themeMode, setThemeMode] = useState(branding?.theme_mode ?? "system");
  const disabled = !canManageSettings || isSubmitting;

  function handlePrimaryColorChange(value: string) {
    setPrimaryColor(normalizeHexColor(value));
  }

  function handleAccentColorChange(value: string) {
    setAccentColor(normalizeHexColor(value));
  }

  function resetDefaults() {
    setAppName(DEFAULT_APP_NAME);
    setPrimaryColor(DEFAULT_PRIMARY_COLOR);
    setAccentColor(DEFAULT_ACCENT_COLOR);
    setThemeMode("system");
    setError(null);
    setSuccess(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const normalizedPrimaryColor = normalizeHexColor(primaryColor);
    const normalizedAccentColor = normalizeHexColor(accentColor);

    if (
      !validateHexColor(normalizedPrimaryColor) ||
      !validateHexColor(normalizedAccentColor)
    ) {
      const errorMessage = `Use valid HEX colors like ${DEFAULT_PRIMARY_COLOR}.`;
      setError(errorMessage);
      notify.warning("Check branding colors", errorMessage);
      return;
    }

    setIsSubmitting(true);

    const payload = {
      accent_color: normalizedAccentColor,
      app_name: appName,
      icon_url: branding?.icon_url ?? "",
      login_heading: branding?.login_heading ?? "",
      login_subtext: branding?.login_subtext ?? "",
      logo_url: branding?.logo_url ?? "",
      primary_color: normalizedPrimaryColor,
      theme_mode: themeMode,
    };

    try {
      const response = await fetch("/api/settings/branding", {
        body: JSON.stringify(payload),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      });
      const result = (await response.json()) as ApiResponse<BrandingResponse>;
      const message = getErrorMessage(result);

      if (!response.ok || message) {
        const errorMessage =
          message ?? "We could not update workspace branding.";
        setError(errorMessage);
        notify.error("Branding could not be saved", errorMessage);
        return;
      }

      setPrimaryColor(normalizedPrimaryColor);
      setAccentColor(normalizedAccentColor);
      setSuccess("Workspace branding updated.");
      notify.success("Branding saved", "Workspace branding was updated.");
      router.refresh();
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "We could not update workspace branding.";
      setError(errorMessage);
      notify.error("Branding could not be saved", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-[var(--ops-text)]">
          Branding
        </h2>
        <p className="text-sm text-[var(--ops-text-soft)]">
          Set workspace display text and color tokens. Owners can manage logo
          uploads from Owner Console.
        </p>
      </div>

      <form className="mt-5 space-y-5" onSubmit={handleSubmit}>
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

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="settings-app-name"
            >
              App name
            </label>
            <input
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
              disabled={disabled}
              id="settings-app-name"
              onChange={(event) => setAppName(event.target.value)}
              required
              type="text"
              value={appName}
            />
          </div>

          <div>
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="settings-theme-mode"
            >
              Theme mode
            </label>
            <select
              className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
              disabled={disabled}
              id="settings-theme-mode"
              onChange={(event) =>
                setThemeMode(event.target.value as typeof themeMode)
              }
              value={themeMode}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="settings-primary-color"
            >
              Primary color
            </label>
            <div className="mt-2 grid gap-3 sm:grid-cols-[72px_1fr]">
              <input
                aria-label="Primary color picker"
                className="h-10 w-full cursor-pointer rounded-lg border border-[var(--ops-border)] bg-white p-1 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled}
                id="settings-primary-color"
                onChange={(event) => handlePrimaryColorChange(event.target.value)}
                type="color"
                value={validateHexColor(primaryColor) ? primaryColor : DEFAULT_PRIMARY_COLOR}
              />
              <input
                aria-label="Primary color HEX"
                className="h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm font-medium text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                disabled={disabled}
                onChange={(event) => setPrimaryColor(event.target.value)}
                onBlur={(event) => handlePrimaryColorChange(event.target.value)}
                required
                type="text"
                value={primaryColor}
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label
              className="text-sm font-medium text-[var(--ops-text)]"
              htmlFor="settings-accent-color"
            >
              Accent color
            </label>
            <div className="mt-2 grid gap-3 sm:grid-cols-[72px_1fr]">
              <input
                aria-label="Accent color picker"
                className="h-10 w-full cursor-pointer rounded-lg border border-[var(--ops-border)] bg-white p-1 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                disabled={disabled}
                id="settings-accent-color"
                onChange={(event) => handleAccentColorChange(event.target.value)}
                type="color"
                value={validateHexColor(accentColor) ? accentColor : DEFAULT_ACCENT_COLOR}
              />
              <input
                aria-label="Accent color HEX"
                className="h-10 w-full rounded-lg border border-[var(--ops-border)] bg-white px-3 text-sm font-medium text-[var(--ops-text)] shadow-sm outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
                disabled={disabled}
                onChange={(event) => setAccentColor(event.target.value)}
                onBlur={(event) => handleAccentColorChange(event.target.value)}
                required
                type="text"
                value={accentColor}
              />
            </div>
          </div>
        </div>

        <div
          className="rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card-soft)] p-4"
          style={
            {
              "--preview-accent": accentColor,
              "--preview-primary": primaryColor,
            } as CSSProperties
          }
        >
          <p className="text-xs font-semibold uppercase text-[var(--ops-text-muted)]">
            Preview
          </p>
          <div className="mt-4 space-y-4 rounded-lg border border-[var(--ops-border)] bg-white p-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white shadow-[0_12px_28px_var(--ops-primary-glow)]"
                style={{ backgroundColor: primaryColor }}
                type="button"
              >
                Primary button
              </button>
              <button
                className="inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-semibold text-white"
                style={{ backgroundColor: accentColor }}
                type="button"
              >
                Accent action
              </button>
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                Active badge
              </span>
            </div>
            <div className="rounded-lg bg-[#071327] p-3">
              <div
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-white" />
                Active nav sample
              </div>
            </div>
            <div>
              <p className="font-semibold text-[var(--ops-text)]">
                {appName || DEFAULT_APP_NAME}
              </p>
              <p className="text-sm text-[var(--ops-text-soft)]">
                Primary {primaryColor} · Accent {accentColor}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            disabled={disabled}
            onClick={resetDefaults}
            type="button"
            variant="secondary"
          >
            Reset to default
          </Button>
          <Button disabled={disabled} type="submit">
            {isSubmitting ? "Saving..." : "Save branding"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
