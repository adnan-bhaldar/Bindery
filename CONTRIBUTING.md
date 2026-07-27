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

**Prerequisites:** Node.js and npm

```bash
git clone https://github.com/adnan-bhaldar/Bindery.git
cd Bindery
npm install
npm run dev
```

## Before opening a PR

Run these locally and make sure both pass cleanly:

```bash
npm run lint
npm run build
```

> **Note:** this project uses TypeScript in strict mode with
> `noUnusedLocals`/`noUnusedParameters` enabled — unused variables or
> parameters will fail the build, not just lint.

If you touched anything UI-related, please test it in **both light and dark
theme** — a fair amount of Bindery's styling is theme-aware in ways that
aren't always obvious from the code alone.

## Code style

- TypeScript, strict mode — avoid `any` where a real type is reasonably
  achievable
- Match the existing patterns in the file you're editing (state management
  via Zustand stores, component structure, etc.) rather than introducing a
  new pattern for the same problem
- Keep PRs focused — one fix or feature per PR is much easier to review than
  several bundled together

## Commit messages

Keep them short and descriptive of *what* changed and *why*.