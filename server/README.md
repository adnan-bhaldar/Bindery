# Bindery MERN backend — setup notes

## Folder placement

```
Bindery/
├── client/              ← your existing frontend, moved here
├── server/              ← everything under server/ in this scaffold
│   ├── server.js
│   ├── config/db.js
│   ├── models/{User,Settings}.js
│   ├── controllers/{authController,settingsController}.js
│   ├── routes/{authRoutes,settingsRoutes}.js
│   ├── middlewares/{authMiddleware,errorMiddleware,rateLimitMiddleware}.js
│   └── utils/{generateToken,logger,statusPage}.js
└── .github/              ← stays at repo root, unchanged
```

## Backend setup

```bash
cd server
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, CLIENT_ORIGIN
npm run dev             # runs via nodemon — auto-restarts on file changes
```

`npm run dev` uses nodemon (see `nodemon.json` — it only watches the server's
own folders, so `node_modules` changes won't trigger restarts). `npm start`
runs it plain with `node` for production. Visiting `http://localhost:5000`
now shows a styled status page instead of "Cannot GET /".

## Frontend file placement

Verified against your actual repo structure (`src/hooks`, `src/stores`,
`src/services`, `src/components/{ui,layout}` — not the generic layout I
guessed at earlier). Copy each file into the matching real location:

| Scaffold file                                              | Real destination                                     | Why                                                                                        |
| ---------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `client-additions/services/authService.ts`                 | `client/src/services/authService.ts`                 | matches your class-based service pattern (`ProjectService`, `HashService`, etc.)           |
| `client-additions/stores/authStore.ts`                     | `client/src/stores/authStore.ts`                     | `stores/` (plural), same as `settingsStore.ts`                                             |
| `client-additions/lib/utils.ts`                            | `client/src/lib/utils.ts`                            | your real file, gained a `diffKeys()` helper used by the manual load button                |
| `client-additions/components/layout/AppShell.tsx`          | `client/src/components/layout/AppShell.tsx`          | your real file, no longer calls the removed `useSettingsSync` hook                         |
| `client-additions/components/ui/AuthDialog.tsx`            | `client/src/components/ui/AuthDialog.tsx`            | next to `ConfirmDialog.tsx`                                                                |
| `client-additions/components/layout/HeaderAuthControl.tsx` | `client/src/components/layout/HeaderAuthControl.tsx` | next to `TopNav.tsx`                                                                       |
| `client-additions/vite-env.d.ts`                           | `client/src/vite-env.d.ts`                           | standard Vite type declaration — missing because no file used `import.meta.env` before now |
| `client-additions/features/settings/SettingsDialog.tsx`    | `client/src/features/settings/SettingsDialog.tsx`    | your real file, patched with a "save to account" button                                    |

## Save-to-account button in SettingsDialog

Added a cloud icon button in the dialog header, between "Reset all settings"
and the close button. Behavior:

- **Logged out**: tooltip reads "Sign in to save settings to your account";
  clicking opens the login dialog (via `openAuthDialog('login')`) instead
  of attempting a save.
- **Logged in**: pushes the current `settings` from `settingsStore`
  straight to `PUT /api/settings` via `settingsSyncService`, shows a
  spinner while saving, and a `toast.success`/`toast.error` on completion —
  same `sonner` toast pattern already used elsewhere in this file (e.g.
  "All local data cleared").

This is a manual save on top of `useSettingsSync`'s automatic debounced
push — the automatic sync keeps working in the background regardless;
this button is for an explicit "save now" affordance.

## Load-from-account button in SettingsDialog

Right next to the save (cloud) button is a matching download button
(`CloudDownload` icon) — pulls whatever was last saved to the account and
overwrites local settings. Since this overwrites local state, it goes
through the same `useConfirm()` confirmation dialog already used for
"Reset all settings," warning that it can't be undone. If nothing has
ever been saved to the account yet, it shows a toast saying so instead of
silently doing nothing.

## Why the theme didn't change after loading settings

`AppSettings` (in `types/index.ts`) has a `theme` field, and `settingsStore`
happily stores/returns it — but that field is **not** what actually renders
the app's visible theme. The real theme lives in a completely separate
persisted store, `useThemeStore` (`stores/themeStore.ts`, its own
`persist` key `bindery:theme`), and `useTheme.ts` reads from _that_ store
to apply the `theme-light`/`theme-dark` class to `<html>`.
`AppearanceSection`'s theme buttons call `useThemeStore`'s `setTheme()`
directly, never touching `settingsStore.settings.theme`.

So the original save/load buttons and `useSettingsSync` were only ever
reading/writing the inert `settingsStore` field — saving never captured
the real theme, and loading never applied it, even though the toast said
"success" (because the Mongo round-trip itself was fine — it just wasn't
touching the right piece of state).

Fixed in three places, all reading/writing `useThemeStore` directly
alongside `settingsStore`:

- `handleSaveToAccount` — overwrites the payload's `theme` field with
  `useThemeStore.getState().theme` before pushing
- `handleLoadFromAccount` — after applying `updateSettings(data)`, also
  calls `useThemeStore.getState().setTheme(data.theme)` if present
- `useSettingsSync` — the debounced auto-push now also fires on theme
  changes (was previously only watching `settingsStore.settings`, so
  changing theme alone never triggered a push at all), and the
  pull-on-login path applies theme the same way

> **This was verified against your real repository.** I pulled the actual
> source, dropped these files in at the paths above, wired `TopNav.tsx` and
> `AppShell.tsx`, and ran the project's real `tsc` + `vite build` —
> both pass clean (2588 modules, 0 errors). Two real type issues were
> caught and fixed in the process: `AppSettings` needed `Partial<AppSettings>`
> instead of a generic `Record<string, unknown>` in the settings sync
> service, and `import.meta.env` needed the `vite-env.d.ts` reference file.

## Frontend env setup

Your `client/` folder currently has **no `.env` file** and no existing
`import.meta.env` usage anywhere in the codebase — this is a new pattern
for the project, so a few extra steps:

1. Create `client/.env` with the contents of
   `client-additions/client-env-file.txt`:
   ```
   VITE_API_URL=http://localhost:5000
   ```
   This is the **base domain only** — no `/api` suffix. In production,
   set it to your deployed backend's URL, e.g.
   `VITE_API_URL=https://bindery-backend.vercel.app`.
2. Your `constants/index.ts` already centralizes config like this
   (`APP_NAME`, `STORAGE_KEYS`, `LAYOUT`, etc.) — add the block from
   `client-additions/constants-addition.ts` to it, rather than reading
   `import.meta.env` directly inside the service file:
   ```ts
   // ─── API ───────────────────────────────────────────────────────────
   export const API_BASE_URL =
     import.meta.env.VITE_API_URL || "http://localhost:5000";
   ```
   `authService.ts` appends `/api` itself when building the axios client
   (`` `${API_BASE_URL.replace(/\/$/, '')}/api` ``, stripping any trailing
   slash first) — so `VITE_API_URL` only ever needs to be the bare domain.
3. **Add `.env` to your root `.gitignore`** — it currently has no rule for
   env files at all (only `server/.gitignore`, which I added earlier, covers
   `server/.env`). See `client-additions/root-gitignore-addition.txt`:
   ```
   .env
   .env.local
   ```
   Without this, `client/.env` would get committed the first time you push.

Install the one new dependency:

```bash
cd client
npm install axios
```

## Wiring into TopNav.tsx

Verified exact placement — add the import near your other `@/components/ui`
and `@/constants` imports:

```tsx
import { HeaderAuthControl } from "@/components/layout/HeaderAuthControl";
```

Then render it right after the Export PDF button, inside the closing `</div>`
of the right-hand icon cluster:

```tsx
        <Tooltip content="Export to PDF" shortcut="⌘E" placement="bottom">
          <button className="nav-export-btn" onClick={openExport} disabled={pageCount === 0}
            style={{ opacity: pageCount === 0 ? 0.5 : 1 }}>
            <Download size={13} strokeWidth={2.5} />
            Export PDF
          </button>
        </Tooltip>

        <HeaderAuthControl />
      </div>
```

It renders its own `nav-sep` divider first, so it drops in cleanly matching
the existing icon groups. It does **not** render `<AuthDialog />` itself —
see the App.tsx section below for why.

## Wiring AuthDialog into App.tsx (important — don't nest it in TopNav)

Earlier versions of this scaffold rendered `<AuthDialog />` from inside
`HeaderAuthControl`. That broke centering: `AuthDialog` uses
`position: fixed` + `margin: auto` to center itself — the exact same
technique your own `ConfirmDialog` uses — but `ConfirmProvider` mounts near
the app root, while `HeaderAuthControl` sits deep inside `TopNav`'s DOM tree.
An ancestor in that chain ends up creating a new containing block, so the
"fixed" dialog centers against a small header-sized box instead of the full
viewport — it renders clipped near the top with no visible backdrop.

Fixed by mounting `AuthDialog` once at app root, same as `RecoveryDialog` /
`WhatsNewDialog` / `StorageWarningDialog`, and driving it entirely from
`authStore` (`dialogOpen`, `dialogMode`, `openAuthDialog()`, `closeAuthDialog()`)
instead of local component state:

```tsx
// App.tsx
import { StorageWarningDialog } from "@/components/common/StorageWarningDialog";
import { AuthDialog } from "@/components/ui/AuthDialog";

export const App = memo(() => (
  <ErrorBoundary>
    <TooltipProvider>
      <ConfirmProvider>
        <ContextMenuProvider>
          <AppShell />
          <RecoveryDialog />
          <InstallBanner />
          <UpdateAvailableDialog />
          <WhatsNewDialog />
          <StorageWarningDialog />
          <AuthDialog />
        </ContextMenuProvider>
      </ConfirmProvider>
    </TooltipProvider>
  </ErrorBoundary>
));
```

`HeaderAuthControl`'s "Sign up" button just calls
`openAuthDialog('signup')` from the store — it doesn't hold or pass any
dialog-open state itself.

## Settings sync is manual-only — no automatic background sync

Earlier versions of this scaffold included `useSettingsSync.ts`, a hook
mounted in `AppShell` that automatically pulled settings on login and
pushed on every change (debounced). **That hook has been removed
entirely.** It caused real, hard-to-diagnose issues in practice:

- Signing up or logging in silently uploaded whatever local settings
  happened to exist at that moment — before the user ever touched
  anything or clicked a save button
- A genuine race between Zustand's `persist` rehydration (from
  `localStorage`) and the automatic pull, both writing to the same
  store on every page load
- Confusing "why did my setting change on its own" behavior in general,
  since two independent triggers (auto-sync + the manual buttons) could
  both fire around the same moment

Sync is now **exclusively manual**, through the two buttons already in
`SettingsDialog`'s header:

- **Cloud (upload)** — `handleSaveToAccount`, pushes current local
  settings (+ live theme) to Mongo, only when clicked
- **Cloud-download** — `handleLoadFromAccount`, pulls from Mongo, only
  when clicked, and only applies fields that actually differ from local
  state (via the shared `diffKeys()` helper in `lib/utils.ts`) — loading
  identical data is a genuine no-op, not an invisible same-value write

Nothing happens automatically on login, signup, or while typing/toggling
settings. If you want automatic sync back later, the removed hook's logic
is preserved in this conversation's history, but note it had the pull-vs-
push races described above — reintroducing it would need to account for
that.

## Header shows an avatar icon, not the email — opens Settings → Account

`HeaderAuthControl` now shows a small profile icon instead of the raw
email once logged in. Clicking it calls `openSettings('account')` on
`uiStore`, which opens `SettingsDialog` deep-linked straight to a new
**Account** section (first item in the sidebar) — no separate profile page.

This required moving `SettingsDialog`'s open/close state from local
`useState` in `AppShell.tsx` into `uiStore` (`isSettingsOpen`,
`settingsSection`, `openSettings()`, `closeSettings()`) — same pattern
already used there for the command palette. `SettingsDialog` syncs its
internal `activeSection` from `settingsSection` on the open transition,
so navigating between sections while the dialog is open isn't fought by
the store.

**Account section** (`AccountSection` in `SettingsDialog.tsx`) has:

- Username + email fields, auto-saving on blur via `updateProfile()`
- A password-change form (current + new password) with its own explicit
  submit button — not auto-save, since a password change shouldn't fire
  on every keystroke or blur
- A sign-out button
- If not authenticated when this section is opened, it shows a "Sign in"
  prompt instead

**Backend additions to support this**: `User.js` gained an optional
`username` field; `authController.js` gained `updateProfile` (username/email,
protected) and `changePassword` (requires current password, protected);
`authRoutes.js` wires `PATCH /api/auth/profile` and `PUT /api/auth/password`.
Both verified end-to-end against the in-memory test harness: signup → set
username → wrong current password rejected (401) → correct password change
→ old password rejected on next login → new password works.

## Why you were still seeing a 401 in the console for /auth/me

Wrapping the `/auth/me` call in try/catch (or `axios`'s `validateStatus`)
stops _our own_ JS from treating it as an error, but it does **not**
stop the browser from logging it — Chrome's DevTools console logs any
XHR response with a 4xx/5xx status in red directly at the network layer,
completely independent of how application code handles the response.
There's no way to suppress that from JS while a request that legitimately
returns 401 is still being made.

The actual fix: **stop making the request** when we already know there's
no session. The auth cookie is httpOnly (unreadable from JS by design),
so `authStore` now sets a small non-sensitive flag in `localStorage`
(`STORAGE_KEYS.HAD_SESSION`) on successful login/signup, clears it on
logout, and `hydrate()` only calls `/auth/me` at all if that flag is
present. A visitor who has never logged in on this browser now triggers
zero network requests on load — genuinely zero console noise, not just
suppressed error handling. If the flag says "maybe" but the cookie turns
out to be expired/invalid, the flag is cleared too so future loads don't
re-request.

Requires the one `STORAGE_KEYS` addition noted in `constants-addition.ts`.

`AuthDialog.tsx` and `HeaderAuthControl.tsx` use your actual CSS custom
properties (`var(--bg-overlay)`, `var(--accent)`, `var(--gradient-accent)`,
`var(--r-2xl)`, etc. from `index.css`) and the same inline-style + framer-motion
pattern as `ConfirmDialog.tsx` — not Tailwind classes, matching how your
dialogs are actually built. It also reuses your existing `Spinner` and
`Tooltip` components rather than introducing new ones.

## Root README — Getting Started now split for client/server

`client-additions/root-README.md` → the repo's root `README.md`.

The "Getting Started" section previously assumed a single-folder setup
(`npm install && npm run dev` at the repo root). Updated to reflect the
actual client/server split, matching the existing README's style
(emoji headers, same code block format):

- **Client**: unchanged commands (`npm install`, `npm run dev`, `npm run build`,
  `npm run preview`, `npm run lint`), just now run from inside `client/`
- **Server**: new subsection — `npm install`, copy `.env.example` to `.env`
  and fill in `MONGO_URI`/`JWT_SECRET`/`CLIENT_ORIGIN`, `npm run dev`
  (nodemon) or `npm start` (production)
- Prerequisites line now also mentions needing a MongoDB connection

## Changelog — v2.0.0

Two files, plus a version bump:

| Scaffold file                             | Real destination                               |
| ----------------------------------------- | ---------------------------------------------- |
| `client-additions/constants/changelog.ts` | `client/src/constants/changelog.ts`            |
| `client-additions/CHANGELOG.md`           | `CHANGELOG.md` (repo root, next to `.github/`) |

Also bump `"version"` in `client/package.json` from whatever it currently
is to `"2.0.0"` — the in-app "What's New" dialog (`useWhatsNew.ts`) only
shows a changelog entry whose `version` matches `APP_VERSION`, which reads
directly from `package.json`. Without this bump, the new 2.0.0 entry in
`changelog.ts` will never actually display to users.

`2.0.0` is the first `MAJOR` version bump in the project's history — every
prior release was `MINOR`/`PATCH`. That's intentional: accounts and a
backend server are a genuinely new dependency the app didn't have before,
not just additive functionality on top of the existing local-first design.

## How to create a MongoDB Atlas user (recap)

1. Atlas → **Database Access** → **Add New Database User**
2. Pick a username (can't be edited later, only replaced) and password
   (autogenerate to avoid special-character escaping issues)
3. Grant **Read and write to any database** (or scope to just `bindery`)
4. Atlas → **Network Access** → allow your IP (or `0.0.0.0/0` for testing)
5. Cluster → **Connect** → **Drivers** → copy the string, fill in your
   credentials and database name, paste into `MONGO_URI`

You don't need to manually create the `bindery` database — Mongoose creates
it on first write (e.g. the first signup).

## Deploying free

- **Backend**: Render or Railway free tier (both sleep on inactivity — first
  request after idle takes a few seconds, worth a loading indicator), **or**
  Vercel serverless — see below if deploying the backend on Vercel too
- **Database**: MongoDB Atlas M0 (512MB, free forever)
- **Frontend**: stays on Vercel as-is

## Deploying the backend on Vercel (instead of Render)

Express normally runs as one long-lived process (`app.listen()`), which
doesn't fit Vercel's serverless model — each request can spin up a fresh
function instance. `server.js` and `config/db.js` are adapted for this:

- `server.js` now does `export default app` and only calls `app.listen()`
  when `process.env.VERCEL` is **not** set — locally and on Render/Railway
  this runs exactly as before; on Vercel, it wraps the exported app as the
  serverless handler instead
- `config/db.js` caches the Mongoose connection on `global` — without this,
  a fresh `mongoose.connect()` on every cold start would exhaust Atlas's
  connection limit quickly
- `vercel.json` (new, in `server/`) routes every request to `server.js`,
  treating the whole Express app as one serverless function

**Setup**: create a second Vercel project pointing at the `server/`
subdirectory (Vercel's "Root Directory" setting in the project's Build
settings), and add the same environment variables as any other host —
`MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_ORIGIN` (set to your
frontend's real URL, e.g. `https://bindery.vercel.app`, no trailing slash).
Then set `VITE_API_URL` on your frontend Vercel project to this backend
project's URL.

**One caveat**: the auth rate limiter (`express-rate-limit`) uses an
in-memory store by default, which doesn't persist or share state across
separate serverless instances the way it does on a single long-running
Render process — it still limits per-instance, just less precisely under
serverless. Not a functional break, just worth knowing if you were relying
on it as a hard guarantee.

## Security notes already baked in

- Passwords hashed with bcrypt (cost factor 12), never returned in API responses
- Auth routes rate-limited (20 attempts / 15 min) against brute force
- Mongoose `unique` index on email, duplicate-key errors mapped to a clean 409
- CORS locked to `CLIENT_ORIGIN` only, with credentials enabled
- Auth cookie is httpOnly — not readable from JS, safer against XSS than localStorage
