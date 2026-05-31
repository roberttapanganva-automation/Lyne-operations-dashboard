# Lyne Rebrand Report

## Default Brand Values

- App name: `Lyne`
- Subtitle: `ServiceOps Command Center`
- Default icon: `/brand/lyne-icon.png`
- Primary color: `#7C5CFF`
- Accent color: `#8B7CFF`
- Dark/navy: `#0B1020`
- Text: `#0F172A`

## Areas Updated

- Added centralized fallback brand constants in `src/lib/branding/defaults.ts`.
- Added the Lyne icon asset at `public/brand/lyne-icon.png`.
- Updated metadata, login/reset-password branding, app shell fallback branding, workspace display helpers, and default brand color tokens.
- Updated Owner Console branding defaults and previews so blank or missing owner branding shows Lyne, while saved workspace branding still takes priority.
- Updated copy and UI fallback labels that previously referenced OpsPilot or the old `OP` default.

## Owner Customization

Owner workspace branding still overrides Lyne whenever a custom app name, logo, icon, primary color, or accent color exists. This patch does not add a migration, does not update stored `workspace_branding` rows, and does not remove branding upload or customization controls.

## Manual Test Checklist

- Open `/login` and confirm the fallback public brand shows Lyne.
- Sign in and confirm the sidebar uses a custom workspace icon/logo when configured.
- Remove or leave blank custom branding fields in a test workspace and confirm Lyne is used as the fallback.
- Open Owner Console branding and confirm owners can still update app name, logo, icon, colors, login heading, and login subtext.
- Confirm collapsed sidebar shows the workspace custom icon when present and the Lyne icon otherwise.

## Validation

- `npm.cmd run lint`: passed with 3 existing warnings in unrelated files.
- `npm.cmd run typecheck`: passed after rerun with write permission for `tsconfig.tsbuildinfo`.
- `npm.cmd run build`: passed after rerun with write permission for `.next` build artifacts.
- Browser QA: `/login?next=%2Fdashboard` rendered with title `Lyne`, one Lyne icon image, and no visible `OpsPilot` text in the DOM snapshot.
