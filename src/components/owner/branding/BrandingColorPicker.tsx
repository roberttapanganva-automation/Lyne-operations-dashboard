"use client";

import { brandingColorPresets } from "@/lib/branding/colorPresets";
import { DEFAULT_BRAND } from "@/lib/branding/defaults";
import { normalizeHexColor, validateHexColor } from "@/lib/validation/branding";

type BrandingColorPickerProps = {
  accentColor: string;
  disabled?: boolean;
  onAccentColorChange: (value: string) => void;
  onPrimaryColorChange: (value: string) => void;
  primaryColor: string;
};

export function BrandingColorPicker({
  accentColor,
  disabled = false,
  onAccentColorChange,
  onPrimaryColorChange,
  primaryColor,
}: BrandingColorPickerProps) {
  const primaryIsValid = validateHexColor(primaryColor);
  const accentIsValid = validateHexColor(accentColor);
  const primarySwatchColor = primaryIsValid ? normalizeHexColor(primaryColor) : "#CBD5E1";
  const accentSwatchColor = accentIsValid ? normalizeHexColor(accentColor) : "#CBD5E1";

  const currentPreset =
    brandingColorPresets.find(
      (preset) =>
        preset.primary_color === primaryColor && preset.accent_color === accentColor,
    )?.label ?? "Custom";

  return (
    <div className="rounded-xl border border-[var(--ops-border)] bg-[var(--ops-card)] p-4">
      <div className="mb-4 flex flex-wrap gap-2">
        {brandingColorPresets
          .filter((preset) => preset.label !== "Custom")
          .map((preset) => (
            <button
              className="inline-flex items-center gap-2 rounded-full border border-[var(--ops-border)] bg-[var(--ops-card-soft)] px-3 py-1 text-xs font-semibold text-[var(--ops-text-soft)] transition hover:border-[var(--ops-primary)] hover:text-[var(--ops-text)]"
              disabled={disabled}
              key={preset.label}
              onClick={() => {
                onPrimaryColorChange(preset.primary_color);
                onAccentColorChange(preset.accent_color);
              }}
              type="button"
            >
              <span className="inline-flex items-center gap-1">
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full border border-[var(--ops-border)]"
                  style={{ backgroundColor: preset.primary_color }}
                />
                <span
                  aria-hidden="true"
                  className="h-3 w-3 rounded-full border border-[var(--ops-border)]"
                  style={{ backgroundColor: preset.accent_color }}
                />
              </span>
              {preset.label}
            </button>
          ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr_1fr]">
        <div>
          <label
            className="text-sm font-medium text-[var(--ops-text)]"
            htmlFor="branding-color-preset"
          >
            Color preset
          </label>
          <select
            className="mt-2 h-10 w-full rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-3 text-sm text-[var(--ops-text)] outline-none transition focus:border-[var(--ops-primary)] focus:ring-2 focus:ring-[var(--ops-primary-glow)]"
            disabled={disabled}
            id="branding-color-preset"
            onChange={(event) => {
              const preset = brandingColorPresets.find(
                (item) => item.label === event.target.value,
              );

              if (!preset || preset.label === "Custom") {
                return;
              }

              onPrimaryColorChange(preset.primary_color);
              onAccentColorChange(preset.accent_color);
            }}
            value={currentPreset}
          >
            {brandingColorPresets.map((preset) => (
              <option key={preset.label} value={preset.label}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="text-sm font-medium text-[var(--ops-text)]"
            htmlFor="branding-primary-color"
          >
            Primary HEX
          </label>
          <div className="mt-2 flex h-10 items-center gap-2 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-3">
            <span
              aria-hidden="true"
              className="h-5 w-5 rounded-full border border-[var(--ops-border)]"
              style={{ backgroundColor: primarySwatchColor }}
            />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--ops-text)] outline-none"
              disabled={disabled}
              id="branding-primary-color"
              name="primary_color"
              onChange={(event) =>
                onPrimaryColorChange(normalizeHexColor(event.target.value))
              }
              onBlur={(event) =>
                onPrimaryColorChange(normalizeHexColor(event.target.value))
              }
              required
              value={primaryColor}
            />
            <input
              aria-label="Pick primary color"
              className="h-6 w-8 cursor-pointer appearance-none rounded border border-[var(--ops-border)] bg-transparent p-0"
              disabled={disabled}
              onChange={(event) => onPrimaryColorChange(normalizeHexColor(event.target.value))}
              type="color"
              value={primarySwatchColor}
            />
          </div>
          {!primaryIsValid ? (
            <p className="mt-2 text-xs text-[var(--ops-danger)]">
              Enter a valid HEX value like {DEFAULT_BRAND.primaryColor}.
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="text-sm font-medium text-[var(--ops-text)]"
            htmlFor="branding-accent-color"
          >
            Accent HEX
          </label>
          <div className="mt-2 flex h-10 items-center gap-2 rounded-lg border border-[var(--ops-border)] bg-[var(--ops-card)] px-3">
            <span
              aria-hidden="true"
              className="h-5 w-5 rounded-full border border-[var(--ops-border)]"
              style={{ backgroundColor: accentSwatchColor }}
            />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-[var(--ops-text)] outline-none"
              disabled={disabled}
              id="branding-accent-color"
              name="accent_color"
              onChange={(event) =>
                onAccentColorChange(normalizeHexColor(event.target.value))
              }
              onBlur={(event) =>
                onAccentColorChange(normalizeHexColor(event.target.value))
              }
              required
              value={accentColor}
            />
            <input
              aria-label="Pick accent color"
              className="h-6 w-8 cursor-pointer appearance-none rounded border border-[var(--ops-border)] bg-transparent p-0"
              disabled={disabled}
              onChange={(event) => onAccentColorChange(normalizeHexColor(event.target.value))}
              type="color"
              value={accentSwatchColor}
            />
          </div>
          {!accentIsValid ? (
            <p className="mt-2 text-xs text-[var(--ops-danger)]">
              Enter a valid HEX value like #0284C7.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
