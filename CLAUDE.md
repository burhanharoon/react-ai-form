# CLAUDE.md — react-ai-form

## Project Overview

react-ai-form is an open-source React library that enhances forms with AI capabilities.
It connects LLM providers (via Vercel AI SDK) to React form libraries (React Hook Form, TanStack Form)
using Zod schemas as the single source of truth for both validation and structured AI output.

## Package Structure

- `@react-ai-form/core` — Provider-agnostic logic (schema utils, streaming, privacy). Zero React dependency.
- `@react-ai-form/react` — React hooks and components (form-library agnostic).
- `@react-ai-form/react-hook-form` — Adapter connecting react-ai-form hooks to React Hook Form's setValue/trigger API.

## Architecture Principles

1. **Zod schema is the single source of truth** — same schema validates form AND constrains LLM output
2. **Form-library agnostic core** — packages/core has zero React/form dependencies
3. **Provider agnostic** — works with any Vercel AI SDK provider (OpenAI, Anthropic, Google, Ollama)
4. **Progressive enhancement** — forms work without AI; AI features are additive
5. **Privacy-first** — fields can opt out of AI processing; sensitive data never sent to LLMs
6. **Accessible** — WCAG 2.2 AA compliant, proper ARIA for suggestions
7. **Streaming-first** — AI responses populate fields in real-time as tokens arrive, not after completion

## Code Conventions

- TypeScript strict mode, no `any` types allowed
- Use `export function` not `export const fn = () =>` (exception: `forwardRef` components use `export const`)
- Named exports only, no default exports (except React components needing React.lazy)
- All hooks prefixed with `use` (useAIForm, useAISuggestion)
- All component files use .tsx extension, all other files use .ts
- kebab-case file names: use-ai-form.ts, ai-field-suggestion.tsx
- PascalCase component names: AIFieldSuggestion, AIFormProvider
- JSDoc comments on ALL public API functions and types
- No console.log in library code
- Prefer `interface` over `type` for object shapes
- Use `satisfies` over `as` for type assertions
- All async operations must support AbortController cancellation
- All useEffect hooks with subscriptions/timers/listeners must return cleanup functions (ref-only effects don't need cleanup)
- React Strict Mode compatible (effects may run twice)

## Testing Conventions

- Every public API function/hook/component needs tests
- Use Vitest + React Testing Library
- Use renderHook from @testing-library/react for hook tests
- Mock AI SDK responses, never call real LLMs in tests
- Test accessibility: ARIA attributes, keyboard navigation, screen reader announcements
- File naming: same name as source with .test.ts(x) extension
- Test files live next to source files (co-located)

## Key Technical Details

- React Hook Form integration: use `setValue(field, value, { shouldDirty: true, shouldTouch: true, shouldValidate: false })` for AI-generated values, then `trigger()` after stream completes
- Vercel AI SDK's `useObject` hook returns streaming partial objects matching Zod schemas
- Zod's `.describe()` method enriches field semantics for LLM prompts
- Ghost text uses CSS overlay: transparent input at z-index:1 over gray suggestion span at z-index:0
- All AI suggestion UIs need `aria-live="polite"` for screen reader announcements

## Peer Dependencies (do not bundle these)

- zod ^3.23
- ai ^4.0
- react ^18.0 || ^19.0
- react-dom ^18.0 || ^19.0
- react-hook-form ^7.50 (only for @react-ai-form/react-hook-form)

## What NOT to Do

- Do not create a custom LLM client — use Vercel AI SDK's provider system
- Do not bundle peer dependencies — they must be peerDependencies
- Do not use CSS-in-JS — ship minimal CSS or use CSS variables for theming
- Do not require a provider/context wrapper for basic usage — hooks should work standalone
- Do not send sensitive fields to LLMs by default — require explicit opt-in

## TypeScript Strictness

The tsconfig enables `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, and `verbatimModuleSyntax`. This means:
- Cannot assign `undefined` to optional props — omit the key instead
- All `Record<string, T>` index access returns `T | undefined` — always guard
- Must use `import type` / `export type` for type-only imports/exports

## Biome & Vitest Notes

- Always run `pnpm lint:fix` after writing new files — Biome enforces import ordering and line-width formatting
- Import `{ describe, it, expect }` from `"vitest"` explicitly — globals are runtime-only, not available to TypeScript
- Avoid `!` non-null assertions — use optional chaining or undefined guards

## Core Package API (for v2+ consumers)

- `schema.ts` — `extractFieldMeta`, `schemaToSystemPrompt`, `filterSchemaByPrivacy`
- `stream.ts` — `createFieldRouter`, `diffPartialObjects`, `DeepPartial`, `FieldRouter`
- `privacy.ts` — `redactPII`, `rehydratePII`, `classifyFieldSensitivity`, `sanitizeFormDataForAI`, `getFieldPrivacyConfig`, `isFieldAIEnabled`
- `cache.ts` — `createAICache`, `createCacheKey`, `AICache`
- `types.ts` — `AIFieldConfig`, `AIFormConfig`, `AIFieldMeta`, `AIFieldUpdate`, `AIFillResult`, `AIFieldError`, `AIFormError`, `AIProvider`

## React Package API

### Hooks
- `useAISuggestion(options)` — per-field suggestions with debounce, caching, abort. Returns `suggestion`, `accept()`, `dismiss()`, `refresh()`, `handleBlur()`, `isLoading`, `error`
- `useAIFormFill(options)` — whole-form streaming fill via `streamObject`. Returns `fillForm(context)`, `fillFromData(data)`, `abort()`, `reset()`, `getFieldStatus(path)`, `markUserModified(path)`, `isFillingForm`, `progress`, `filledFields`, `error`
- `useAIFormContext()` — returns provider context (throws outside `AIFormProvider`)
- `useResolvedConfig(hookProps?)` — merges hook props > context > defaults (makes provider optional)

### Components
- `AIFieldSuggestion` — ghost text overlay input (forwardRef, extends InputHTMLAttributes)
- `AIFormFillerButton` — "Fill with AI" button with idle/loading/progress/complete states + headless `asChild` mode
- `AIConfidenceBadge` — field status indicator (ai-filled, user-modified, empty)
- `AIFormProvider` — optional shared config context

### Accessibility utilities (`utils/a11y.ts`)
- `useAriaLiveAnnounce()` — screen reader announcements with debounce
- `useReducedMotion()` — `prefers-reduced-motion` listener
- `useFocusTrap(ref, active)` — keyboard focus trap
- `AI_FORM_ARIA_LABELS` — standard ARIA label templates

## Releasing & Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and npm publishing.

**Always create a changeset when making user-facing changes.** Before committing/pushing a feature, bug fix, or breaking change, run `pnpm changeset` or manually create a `.changeset/<name>.md` file:

```md
---
"@react-ai-form/core": minor
"@react-ai-form/react": minor
---

Description of what changed (becomes the CHANGELOG entry)
```

- `patch` — bug fixes, docs, internal refactors
- `minor` — new features, new exports
- `major` — breaking API changes
- If a package only changed because a dependency bumped, use `patch`
- All three packages are **linked** — they release together

**Do NOT manually edit version numbers in package.json** — Changesets handles this.

The release flow:
1. Changeset file merged to main → GitHub Actions creates a "Version Packages" PR
2. Merging that PR → publishes all updated packages to npm

Publishing uses **npm trusted publishing (OIDC)** — no npm tokens needed. The release workflow uses Node 24 (npm 11.5.1+ required for OIDC with scoped packages). Trusted publishers are configured per-package on npmjs.com.

## Build & Dev Commands

```bash
pnpm build       # Build all packages (turbo)
pnpm test        # Run all tests (turbo)
pnpm lint        # Lint with Biome
pnpm lint:fix    # Auto-fix lint issues
pnpm format      # Format with Biome
pnpm typecheck   # Type-check all packages
pnpm dev         # Watch mode for all packages
pnpm clean       # Remove dist, .turbo, node_modules
pnpm changeset   # Create a changeset for version bump
```

Never mention claude in any PR
