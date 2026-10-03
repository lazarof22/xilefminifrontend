# licencia-ui-review

## Objective
Fix the UI defects found by a Playwright review of the `/licencia` page (real backend + mocked states).

## Problem / Why
The license page shows wrong dates (one day early), misleading values and messages, low-signal warnings,
buttons whose disabled state is indistinguishable from enabled, and a broken mobile header.

## Scope
`src/utils/licencia.ts`, `src/components/licencia/*`, `src/pages/configuracion/Licencia.tsx`,
`src/theme/MuiProvider.tsx` (contained button disabled state), `src/components/DashboardLayout.tsx` (mobile).

## Constraints
- Keep MUI patterns and the palette in `src/theme/MuiProvider.tsx`; no ad-hoc hex colors.
- Do not touch the uncommitted `axios` change in `package.json` / `package-lock.json`.
- No test runner exists in this repo: test-first exception; checks are `tsc -b`, `eslint`, `vite build`
  and a Playwright screenshot pass.

## Delivery
Strategy: `ask-on-risk`. Forecast ~250 authored changed lines. Branch `fix/licencia-ui-review`.

## Tasks
- [x] T1 Dates: license dates (`fecha_inicio`, `fecha_vencimiento`) formatted in UTC so `2026-10-03T00:00Z` shows `03/10/2026`.
- [x] T2 `max_usuarios: 0` shown as "Ilimitado" (KPI and detail).
- [x] T3 KPI "Vencimiento" uses the same source as the detail card (expired license shows its date).
- [x] T4 No "Inicia sesión como administrador" flash while loading.
- [x] T5 Contained button disabled state visually distinct (theme override).
- [x] T6 Logged-in non-admin message: "Solo un administrador puede gestionar la licencia"; keep login prompt when there is no session.
- [x] T7 Expiry warning alert at <=30 days (warning) and <=7 days (error) for a valid license; progress bar color follows severity.
- [x] T8 Status KPI icon matches severity (not a check shield on errors/warnings).
- [x] T9 Human-readable `tipo` labels.
- [x] T10 Mobile (390px): page title visible, no empty left gutter, brand on one line.

Route: delegated direct (writer trigger: 2+ non-trivial files).

## Acceptance
Each item verified in a Playwright screenshot; `tsc -b`, `eslint .`, `vite build` pass (or pre-existing failures documented).

## Progress / Evidence
- All T1–T10 implemented by one delegated writer; route: delegated direct (2+ non-trivial files).
- Playwright pass (Chrome for Testing 153, real backend + mocks): UTC dates (Inicio 03/10/2026), 'Ilimitado', expired KPI date, no loading flash,
  gray disabled buttons, 'Solo un administrador…' for 403, expiry alerts + bar colors (365d success rgb(16,185,129), 20d warning, 3d error),
  severity icons, 'Suscripción anual' label, mobile header OK.
- eslint on edited files: 3 pre-existing no-unused-vars in DashboardLayout (87,170,171), no new findings.
- tsc -b: fails on base (Ventas/PuntoVenta/Tasa + same 3 DashboardLayout TS6133); no new errors in edited files. npm run build fails at tsc on base; vite build alone passes.
- Out of scope finding: mobile drawer never opens (mobileOpen never set true) in DashboardLayout.

- Follow-up (inline, user request): .lic preview uses etiquetaTipoLicencia; Playwright shows "Suscripción anual" in preview; eslint clean, no tsc errors in file.

## Next step
Commit work unit; user decides push/PR and the mobile drawer follow-up.
