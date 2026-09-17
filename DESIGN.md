# MDS Design System

Status: **PRODUCTION APPROVED**\
Authority: **Final Global UI Production Release**\
Date: **2026-09-14**

This document is the default UI authority for future MDS applications. It records the system that is running in Production at the reference source SHAs and image digests in section S.

## A. Core principles

**ONE BRAND**\
**ONE SHARED VISUAL LANGUAGE**\
**ONE APP LAUNCHER**\
**MULTIPLE APP-LOCAL WORKFLOWS**

Primary implementation rule:

> **STANDARDIZE THE FRAME. PRESERVE THE WORKFLOW.**

Standardize the corporate brand, launcher, shared shell, navigation treatment, responsive shell behavior, typography, common visual tokens, account/role/logout presentation, focus treatment, and Return to Launcher.

Keep business workflows and app-local content owned by each application. A shared visual treatment is never authority to change routes, permissions, API contracts, calculations, write behavior, confirmations, recovery paths, or business states.

## B. Corporate brand

- Brand: **Media Shopping**.
- Official logo SHA-256: `217b80d01e1a9e3932f96d511c8803f7beda7d09a83db621484bc9110380bfa8`.
- Use the approved official asset only.
- Do not redraw, recolor, crop, distort, regenerate, or replace it with a letter or placeholder mark.
- Production must never ship a placeholder logo.
- Corporate identity identifies the MDS ecosystem; the app identity beside it identifies the current application.

## C. Typography

- Primary family: **Kanit**.
- Load from local/self-hosted font assets only; use `font-display: swap`.
- No Google Fonts, external font CDN, or other runtime font dependency.
- Shared-shell typography applies to the frame. Existing app-content typography may be migrated deliberately, but must not be globally reset in a way that changes workflow controls or data density.
- Use a clear hierarchy: page title, section title, body, label, metadata. Preserve readable Thai and Latin text without artificial letter spacing.

## D. Final design tokens

These values are extracted from the final Production source. They govern shared-shell and new shared UI work; existing app-local tokens remain valid inside their workflow boundary.

| Token | Production value | Use |
|---|---:|---|
| Navy | `#0b1d40` | Sidebar, strong brand frame |
| Navy soft | `#14284f` | Navy-surface hover/secondary treatment |
| Primary blue | `#2364d2` | Primary action, active state, focus |
| Primary hover | `#1e46b8` | Primary interactive hover |
| Primary soft | `#e9f0fd` | Selected/soft-blue surface |
| Background | `#f4f7fb` | Application canvas |
| Surface | `#ffffff` | Cards, controls, panels |
| Border | `#e2e8f3` | Default boundary |
| Border strong | `#cbd6e8` | Emphasized boundary |
| Text | `#14213d` | Primary text |
| Muted text | `#596b85` | Secondary text |
| On-navy muted | `#b7c8e7` | Secondary text on sidebar |
| On-navy focus | `#a9cbff` | Keyboard focus on navy |

Semantic status colors already present in Production include:

- Success/present: `#0f7a5c` on `#e8f7f1`.
- Warning/review: `#9a6500` on `#fff4dc`.
- Danger/absence: `#c43a3a` on `#fdecec`.
- Order Import error treatment may use `#991b1b` on `#fef2f2` inside its app-local boundary.

### Geometry, depth, and interaction

- Shared card radius: `18px`; app-content panel radius commonly `12px`.
- Login card radius: `22px` desktop and `20px` mobile.
- Shared launcher card shadow: `0 1px 3px #0b1d400f`; hover: `0 8px 22px #0b1d4014`.
- App-content panel shadow: `0 10px 28px rgba(21, 39, 73, 0.07)`.
- Login card shadow: `0 18px 48px rgb(11 29 64 / 0.10)`.
- Default shared focus: `3px` primary outline with `3px` offset. On navy, use `#a9cbff`. Login controls use the established white inner/`#2563eb` outer focus treatment.
- Production recurring spacing values: `3, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 44, 48, 52, 56px`. Prefer `8, 12, 16, 20, 24, 28, 32px` for new shared-shell layouts; keep smaller and larger values only where an existing component contract requires them.
- Shared navigation item minimum height: `46px`; Return to Launcher: `48px`; mobile header controls: at least `44px`.
- Login input minimum height: `50px`; sign-in button minimum height: `52px`.
- Navigation glyphs: typically `20px` with `1.8` stroke; existing Order Import content glyphs may remain `22px` with `1.7` stroke.
- Standard in-app identity badge: `34 × 34px`, radius `9px`.
- Standard launcher identity badge: `46 × 46px`, radius `13px`.
- HR’s standardized semantic badge is `40 × 40px`, `10px` internal padding, `10px` radius, with a `20 × 20px` attendance/time glyph. Launcher and HR in-app identity use the same glyph family and centered geometry.

Do not copy a token into app content merely to make unrelated workflows look identical. Tokens support hierarchy and consistency; they do not replace state semantics.

## E. Shared shell geometry

| View | Geometry | Behavior |
|---|---|---|
| Desktop | `248px` sidebar, `64px` header | Full navigation labels |
| Tablet | `80px` rail, `64px` header | Compact icons; expansion may reveal the `248px` shell |
| Mobile | Drawer width `min(296px, calc(100vw - 48px))`, `64px` header | Off-canvas navigation with backdrop |

- Mobile backdrop: `rgba(11, 29, 64, 0.48)`.
- Escape closes an open drawer.
- Focus is contained while a modal drawer is open and returns to the menu trigger on close.
- Return to Launcher remains reachable in desktop, tablet, and mobile navigation.
- Reduced-motion preferences remove nonessential transitions.
- Do not reposition high-risk app actions into the shared header.

## F. Corporate brand block

- Sidebar brand area aligns to the `64px` header and uses `8px` outer padding.
- Official logo container: `48 × 48px`, white surface, `6px` radius.
- Gap between logo and corporate text: `10px`.
- Corporate label uses approximately `12px`, weight `600`; supporting line uses approximately `10px`.
- Desktop shows logo plus text. Tablet prioritizes the logo in the compact rail. Mobile preserves the same asset and hierarchy inside the drawer.
- Keep the logo’s intrinsic proportions and clear space. Do not stretch it to fill the container.

## G. App identity

Every app must look like part of the same MDS system while remaining semantically identifiable.

- Use the shared badge geometry family and consistent centering, padding, radius, color relationship, and icon stroke.
- Use a glyph that describes the application, not a generic decorative mark.
- User Management uses a people/users semantic glyph.
- HR Attendance uses an attendance/time semantic glyph.
- Do not reuse the same semantic glyph for unrelated applications.
- Launcher and in-app identity must use the same glyph/shape for the same application.
- App identity is visual metadata only; it does not grant a route or permission.

## H. Navigation

- Place app-owned navigation in the shared sidebar/rail/drawer.
- Preserve the application’s existing item order, labels, hrefs, route handlers, permissions, disabled reasons, and active-state logic.
- Use a visible active state, distinct hover state, and keyboard-visible focus state.
- Keep icons adjacent to labels; never rely on icon shape alone when the label can be shown.
- Keep Return to Launcher at the bottom of the navigation model.
- Navigation visibility must follow existing route and RBAC authority. Visual design must never invent a permission, card, or route.

## I. Header

- Fixed shared height: `64px`.
- Show the current app/page identity and the responsive menu/collapse control.
- Keep current account identity, exact role, and logout reachable.
- Compact account presentation at narrower widths without hiding logout.
- Preserve operational or safety information owned by the app.
- Do not move Payment, ZORT, BEST, User Management, Dashboard Settings, or HR workflow actions into the shared header.

## J. App Launcher

The launcher is the single entry point for authorized MDS applications.

- Final ADMIN card set: **Dashboard**, **Order Import**, **User Management**, **HR Attendance**.
- HR Attendance is **ADMIN-only**. SUPERVISOR and VIEWER must not see its card.
- The launcher uses the current account greeting, the concise main heading, and authorized application cards. Do not restore removed duplicate hero copy.
- Desktop `1440px`: four cards.
- Tablet `1024px`: `2 × 2` grid.
- Mobile `390px`: single-column stack.
- Production grid uses `auto-fit` cards with a `280px` minimum where space permits and a `1280px` content maximum.
- The official-logo watermark is subtle: desktop width up to `544px`, approximately `0.045` opacity; tablet retains its approved lower offset; mobile hides it.
- Card links, availability, and role visibility come from real navigation authority, not from mockup content.

## K. Login

- Use a centered modern card with the official Media Shopping logo as the primary visual anchor.
- Title: **เข้าสู่ระบบ MDS**.
- Required fields: **Email** and **Password**.
- Use one clear primary sign-in button.
- Keep the presentation restrained and corporate; do not add unnecessary marketing copy, fake accounts, or artificial wait states.
- Preserve the real auth/session adapter, error semantics, password visibility behavior, and keyboard submission.

## L. Browser titles

| Surface | Exact title |
|---|---|
| Launcher | `MDS Online` |
| Dashboard | `MDS Dashboard` |
| Order Import | `MDS Order Import` |
| User Management | `MDS User Management` |
| HR Attendance | `MDS HR Attendance` |

Future applications use: `MDS <Application Name>`.

## M. Responsive standard

Primary rule: **REFLOW BEFORE SHRINKING**.

- Preserve readable labels, useful hit targets, and stable workflow order before reducing dimensions.
- Avoid absolute-positioning fixes for form layouts.
- At `1440px`, use the full shell and intended multi-column content.
- At `1024px`, use the `80px` rail and reflow app content.
- Dashboard tablet filters use true stacked rows:
  - Row 1: channel selector.
  - Row 2: date range plus วันนี้ / 7 วัน / 30 วัน.
- HR tablet separates company/period controls from the upload control according to the approved Production layout.
- At `390px`, use single-column content where necessary and keep the shared drawer off-canvas when closed.
- App-local tables may scroll within a labeled region when reflow would destroy meaning; the page shell itself must not horizontally overflow.

## N. Accessibility

- All interactive controls must be keyboard reachable.
- Provide visible focus; never remove outlines without an equally visible replacement.
- Use semantic buttons, links, labels, headings, table structure, and status text.
- Keep mobile and compact-shell targets at least `44px` where applicable.
- Escape closes drawers and modal surfaces where the interaction contract supports it; return focus to the invoking control.
- Trap focus only while a modal drawer/dialog is open.
- Maintain appropriate contrast, including at least `4.5:1` for normal text.
- Do not encode critical status, error, warning, or selection solely by color.
- Honor reduced-motion preferences and avoid decorative motion that blocks work.

## O. App-local workflow boundaries

The shared frame may wrap, align, and responsively present existing content. It must not casually rewrite:

- Payment confirmation, readiness, retry, recovered-success, timeout, or unknown behavior.
- ZORT write enablement, `DRY_RUN`, `ZORT_READ_ONLY`, or writer behavior.
- BEST COD/Tracking write, conflict, ambiguous, recovery, reservation, or retry semantics.
- StoreMapping parsing, matching, and write behavior.
- Dashboard KPI calculations, CN semantics, Settings save/deactivate behavior, or any Settings write.
- User creation, role change, active/inactive, password reset, last-active-ADMIN protection, CSRF, audit, and confirmation sequencing.
- HR attendance import, employee rules, leave/OT rules, approvals, payroll preparation, period close/reopen/locking, persistence, or calculation.
- Auth, Session, RBAC, route authority, APIs, databases, migrations, secrets, or runtime configuration.

Frame ownership examples: sidebar width, header height, brand block, app identity, focus treatment, responsive drawer. Workflow ownership examples: which data can be submitted, who may confirm, required warnings, failure recovery, and backend authorization.

## P. Fast Visual Path

For low-risk, presentation-only work:

1. Implement locally in a clean, scoped worktree.
2. Run focused tests, typecheck, lint, and build as applicable.
3. Capture desktop/tablet/mobile screenshots.
4. Obtain Owner visual acceptance.
5. Commit, push, and create a clean scoped PR.
6. Merge normally after the Owner checkpoint.
7. Deploy the affected Staging Web service only, with a recorded Web-only rollback.

Stop the Fast Visual Path when scope reaches backend behavior, Auth, Session, RBAC, runtime configuration, API contracts, database/schema, business writes, route semantics, or a high-risk workflow. Production always requires a separate protected release checkpoint.

## Q. High-risk exclusions

The following require separate architecture, safety, and Owner approval; this design system does not authorize them:

- Payment writes and confirmation semantics.
- ZORT writes and write/read safety configuration.
- BEST writes, confirmations, reservations, conflict/unknown recovery, and retry behavior.
- Auth, Session, and RBAC.
- Database schema, migrations, and data mutation.
- Secrets, credentials, and service identity.
- Runtime configuration and safety flags.
- Production infrastructure, gateway, Shared Auth, APIs, workers, cron, and networks.
- User, Dashboard Settings, and HR privileged/destructive/irreversible operations.

## R. HR Production build contract

This is an implementation/deployment invariant, not a visual token:

- HR source: `1eb7df3516f5f9051a8c8cd21b981bba70aef4fd`.
- `VITE_HR_API_BASE_URL=/dashboard`
- `VITE_HR_BASE_PATH=/hr-attendance/`
- Auth bootstrap: `/dashboard/api/auth/current-actor`
- The API base and application base are intentionally different.
- Do not infer `/hr-attendance/api/` from the app base. In particular, `/hr-attendance/api/auth/current-actor` is not the Production contract.

## S. Final reference implementations

| Surface | Production source authority | Production Web image |
|---|---|---|
| Order Import / Launcher / Users | `592c4098dcb5dc10f899182c25bec5390cf27ba6` | `sha256:2b811cc0054f0cd8b6f7b0793b19fc644261cb0f78c87835275bdf5c121cdb48` |
| Dashboard | `1eb7df3516f5f9051a8c8cd21b981bba70aef4fd` | `sha256:12d2a25b29ac8291004cb3e12a09ab824899f6d1f5492d487ecb52576a14e323` |
| HR Attendance | `1eb7df3516f5f9051a8c8cd21b981bba70aef4fd` | `sha256:18aeffa89d69046172b3d53736115353d54f6ea6a3d121db8c40fb2606da1698` |

Reference surfaces: final Production Login and session check; Launcher; Order Import shared shell; User Management page-mode shell; Dashboard shared shell; HR Attendance shared shell.

Implementation source locations include the shared-shell styles/components and portal navigation in the two reference repositories. Use the exact Production SHAs above when resolving them; do not use rejected historical Wave B mockups or held candidates as implementation authority.

## T. Do / Don't

**Do**

- Reuse the shared shell, tokens, official logo rules, navigation pattern, and responsive behavior.
- Use a distinct semantic app icon and keep it consistent between Launcher and in-app identity.
- Preserve route/RBAC authority and app-local workflow states.
- Reflow controls at tablet/mobile widths before shrinking them.
- Keep CSS scoped to the shared shell or the owning application.
- Validate focus, contrast, labels, target size, reduced motion, and non-color status cues.
- Record exact source and image provenance for releases.

**Don't**

- Redesign the Media Shopping brand per application.
- Copy an unrelated app’s semantic icon.
- Modify business logic to achieve visual consistency.
- Introduce external font dependencies.
- Add navigation that bypasses or invents RBAC.
- Assume an API base from an application base.
- Apply unscoped resets to `button`, `input`, `select`, `textarea`, `table`, `.card`, or `.btn` across workflow surfaces.
- Move high-risk actions into the shared frame.

## U. Authority and supersession

This `DESIGN.md` supersedes earlier draft Global UI visual specifications for future MDS UI implementation. It represents the final Production-approved system recorded on 2026-09-14.

It does **not** supersede security architecture, Auth/RBAC contracts, business-logic documentation, payment/BEST/ZORT safety documentation, database contracts, or deployment/security runbooks. When those authorities conflict with a visual preference, the security, business, and operational contracts prevail.
