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
- Use `export function` not `export const fn = () =>`
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
- All useEffect hooks must return cleanup functions
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
```
