# Contributing to Bindery

Thanks for considering contributing — whether that's a bug report, a feature
idea, or a pull request, it's genuinely appreciated.

Bindery is maintained by one person, so response times can vary. Please be
patient, and know that every issue and PR does get read.

## Before you start

For anything beyond a small fix (typo, obvious bug), please open an issue
first to discuss the change. This avoids spending time on a PR that doesn't
end up fitting the project's direction.

## Development setup

**Prerequisites:** Node.js, npm, and a MongoDB connection (a free
[Atlas](https://www.mongodb.com/atlas) cluster works fine) if you're
touching anything backend-related

```bash
git clone https://github.com/adnan-bhaldar/Bindery.git
cd Bindery
```

Bindery is split into `client/` (frontend) and `server/` (backend), each
with its own dependencies.

```bash
# Client
cd client
npm install
npm run dev

# Server (in a separate terminal)
cd server
npm install
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, CLIENT_ORIGIN
npm run dev
```

You only need the server running if you're working on account/settings-sync
functionality — the client works standalone for everything else (import,
editing, export, OCR are all local-only).

## Before opening a PR

If you touched the **client**, run these locally and make sure both pass cleanly:

```bash
cd client
npm run lint
npm run build
```

> **Note:** the client uses TypeScript in strict mode with
> `noUnusedLocals`/`noUnusedParameters` enabled — unused variables or
> parameters will fail the build, not just lint.

If you touched the **server**, make sure it starts cleanly and the routes
you touched still work as expected:

```bash
cd server
npm install
npm run dev
```

There's no automated test suite for either side yet — manual verification
against real requests (or the endpoints you changed) is the current bar.

If you touched anything UI-related, please test it in **both light and dark
theme** — a fair amount of Bindery's styling is theme-aware in ways that
aren't always obvious from the code alone.

## Code style

**Client:**

- TypeScript, strict mode — avoid `any` where a real type is reasonably
  achievable
- Match the existing patterns in the file you're editing (state management
  via Zustand stores, component structure, etc.) rather than introducing a
  new pattern for the same problem

**Server:**

- Plain JavaScript (ESM), not TypeScript
- Follows the standard Express layering already in place: routes → protect/
  validate in middleware → controllers hold the actual logic, models stay
  thin (Mongoose schemas + instance methods only)
- Match existing response shapes (`{ message }` for errors, direct payload
  for success) rather than introducing a new response format

**Both:**

- Keep PRs focused — one fix or feature per PR is much easier to review than
  several bundled together

## Commit messages

Keep them short and descriptive of _what_ changed and _why_.
