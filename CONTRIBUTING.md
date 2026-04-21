# Contributing to react-ai-form

Thanks for your interest in contributing! This guide covers everything you need to get from a fresh clone to a merged PR.

Particularly welcome:

- New form-library adapters (TanStack Form, Formik, Conform, React Final Form).
- New model-provider recipes in the README (Anthropic, Google, Mistral, local Ollama).
- Accessibility improvements — screen-reader behaviour, keyboard handling, `prefers-reduced-motion`.
- Bug reports with a minimal repro (a CodeSandbox / StackBlitz reproducing the issue beats a GIF).
- Documentation fixes and clarifications.

For larger refactors or API changes, open an issue first so we can align on scope before you write code.

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20.x or 22.x (matches CI matrix) |
| pnpm | 10.x (pinned in `package.json#packageManager`) |
| Git | any recent |

Install pnpm via Corepack:

```bash
corepack enable
corepack prepare pnpm@10 --activate
```

---

## Local setup

```bash
git clone https://github.com/burhanharoon/react-ai-form.git
cd react-ai-form
pnpm install

# Build the library packages once so the demo + tests can import them.
pnpm build --filter='@react-ai-form/*'

# Run the demo app (no OPENAI_API_KEY needed — uses mock fixtures).
pnpm --filter demo dev
```

Open http://localhost:3000. To hit a real model, drop an `OPENAI_API_KEY` into `apps/demo/.env.local` and restart.

---

## Daily loop

Pick whichever layer you're changing.

### Library work (most common)

```bash
# One terminal: watch-rebuild the packages you're editing
pnpm dev

# Another terminal: rerun tests on save (Vitest in watch mode inside the package)
pnpm --filter @react-ai-form/react test --watch
```

### Demo work

```bash
pnpm --filter demo dev
```

### Cross-cutting checks before you open a PR

```bash
pnpm lint:fix     # Biome — auto-formats and auto-fixes what it can
pnpm lint         # Biome — errors if anything's still wrong
pnpm typecheck    # tsc --noEmit across every workspace
pnpm test         # Vitest, all packages
pnpm build        # tsup + Next.js demo build
```

All of the above run in CI on every PR, for Node 20 and Node 22. If it passes locally it almost always passes in CI.

---

## Project layout

```
packages/
  core/               Zero-dependency schema / streaming / privacy utilities
  react/              Hooks and components (form-library agnostic)
  react-hook-form/    React Hook Form adapter (re-exports /react)
apps/
  demo/               Next.js 16 demo app
prompts/              Phase-by-phase build prompts (historical)
.changeset/           Pending version bumps
```

Packages are linked — they always publish at the same version. The demo is excluded from releases (`.changeset/config.json#ignore`).

---

## Commit style

Conventional Commits, optionally scoped by package:

```
feat(rhf): add useAIForm hook
fix(core): handle nested objects in redactPII
docs: add ghost-text recipe
chore(demo): bump next to 16.2.5
test(react): cover abort during streaming
```

Valid types: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `perf`. Valid scopes: `core`, `react`, `rhf` (for `@react-ai-form/react-hook-form`), `demo`. The scope is optional — root-level changes (CI, Biome, etc.) can go unscoped.

---

## Changesets

This repo uses [Changesets](https://github.com/changesets/changesets) for versioning. **Every user-facing change needs a changeset** — you add one to your PR, and after merge a bot opens a "Version Packages" PR that bumps versions and publishes to npm when merged.

Create one:

```bash
pnpm changeset
```

Or write one by hand: `.changeset/<descriptive-name>.md`:

```md
---
"@react-ai-form/core": patch
"@react-ai-form/react": minor
"@react-ai-form/react-hook-form": minor
---

Short summary that becomes the CHANGELOG entry.
```

Bump-type rules:

- **`patch`** — bug fixes, docs edits, internal refactors.
- **`minor`** — new features, new exports.
- **`major`** — breaking changes to the public API.
- If a package only changed because a dependency it lives with bumped, still use `patch`.
- All three library packages are **linked**, so they always release together. Include all three names in the frontmatter if any user-visible behaviour changes.
- The `demo` workspace is excluded from releases — don't add it to a changeset.

Publishing uses npm trusted publishing (OIDC); no tokens are handled anywhere. Do not edit `version` in `package.json` by hand.

---

## PR checklist

Before clicking "Open pull request":

- [ ] Your branch is named `feat/…`, `fix/…`, `docs/…`, or similar — not `main`.
- [ ] `pnpm lint` is clean.
- [ ] `pnpm typecheck` is clean.
- [ ] `pnpm test` is clean.
- [ ] `pnpm build` is clean.
- [ ] A changeset is included if any library package changed user-visible behaviour.
- [ ] If you added a new public API, it has a JSDoc comment (required per [CLAUDE.md](CLAUDE.md)).
- [ ] If you touched tests, they use Vitest + React Testing Library with explicit imports (`import { describe, it, expect } from "vitest"`).
- [ ] The PR description includes a short Summary and a Test plan (even a 3-line checklist is fine).

---

## Code review

- We look at correctness first, then readability, then churn. Small PRs get merged fast.
- Please address every review comment — either change the code or explain the reasoning. "Won't fix" is a valid answer with a rationale.
- Reviewers turn around within a few days for non-urgent PRs, same day for security fixes.
- CI must be green at merge time.

---

## Good first issues

Filtered to issues tagged as approachable:

- https://github.com/burhanharoon/react-ai-form/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22
- https://github.com/burhanharoon/react-ai-form/issues?q=is%3Aopen+is%3Aissue+label%3A%22help+wanted%22

Recipe documentation and new provider examples are always appreciated.

---

## Code of conduct

Be kind, be specific, assume good intent. Report anything inappropriate to the maintainer directly.

---

## Questions

Open a [discussion](https://github.com/burhanharoon/react-ai-form/discussions) or a [question-labeled issue](https://github.com/burhanharoon/react-ai-form/issues/new?labels=question) — quicker than email.
