# Examples

Copy-paste-ready examples for [`react-ai-form`](../). Each file is
self-contained — drop it into a Next.js 14+ app router page (`app/…/page.tsx`)
or a Vite + React 18/19 project (`src/App.tsx`) and it runs.

These files are **not** part of the monorepo's lint, typecheck, or build
pipelines, and they are **not** published to npm. They mirror what a
consuming app looks like — every import is from `@react-ai-form/*` as if
the packages came from npm.

## The examples

| # | File | What it shows |
|---|------|---------------|
| 01 | [`01-basic-form-fill.tsx`](./01-basic-form-fill.tsx) | Simplest `useAIForm` + `fillForm` integration — ~40 lines, mirrors the README Quick Start. |
| 02 | [`02-ghost-text-suggestions.tsx`](./02-ghost-text-suggestions.tsx) | Gmail Smart Compose-style ghost text with `useAISuggestion` + `AIFieldSuggestion`. No form library required. |
| 03 | [`03-privacy-config.tsx`](./03-privacy-config.tsx) | Per-field opt-out (`sensitivity: "high"`) + client-side PII redaction via `redactPII`. |
| 04 | [`04-shadcn-ui-integration.tsx`](./04-shadcn-ui-integration.tsx) | Wire `useAIForm` into shadcn/ui's `Form`/`FormField` scaffolding with `AIFormFillerButton asChild`. |
| 05 | [`05-streaming-progress.tsx`](./05-streaming-progress.tsx) | Progress bar + per-field flash animation driven by the `data-ai-status` attribute. |
| 06 | [`06-custom-provider-ollama.tsx`](./06-custom-provider-ollama.tsx) | Local model via Ollama's OpenAI-compatible endpoint — no data leaves the machine. |
| 07 | [`07-multi-step-form.tsx`](./07-multi-step-form.tsx) | Multi-step wizard with `z.object().extend()` composition — one AI call fills every step. |
| 08 | [`08-natural-language-fill.tsx`](./08-natural-language-fill.tsx) | Free-text description → structured flight-booking fields, with `onFillComplete` summary. |

## How to run one

### Next.js (14+ / 15+)

```bash
npx create-next-app@latest my-app --typescript --app
cd my-app
npm install @react-ai-form/react-hook-form react-hook-form zod \
  @hookform/resolvers ai @ai-sdk/openai
# Example 06 needs @ai-sdk/openai-compatible instead of @ai-sdk/openai.
# Example 04 also needs shadcn: pnpm dlx shadcn@latest add form input button label
```

Paste an example into `app/demo/page.tsx` (or move it there and re-export):

```tsx
// app/demo/page.tsx
export { BasicFormFillExample as default } from "./01-basic-form-fill";
```

Then:

```bash
export OPENAI_API_KEY=sk-...
npm run dev
# open http://localhost:3000/demo
```

### Vite + React 18 / 19

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install @react-ai-form/react-hook-form react-hook-form zod \
  @hookform/resolvers ai @ai-sdk/openai
```

Paste an example into `src/App.tsx` (remove the `"use client"` directive —
it's a Next.js thing, harmless in Vite but unnecessary) and import its
exported component. Set `VITE_OPENAI_API_KEY` in `.env.local` and pass it
through `import.meta.env` to the provider factory.

## Production note

Every example uses the model factory on the client for brevity. In
production you should proxy the model through your own server endpoint
so your API key never ships to the browser — see the
[Privacy & Security](../README.md#privacy--security) section of the root
README and [`apps/demo/lib/proxy-model.ts`](../apps/demo/lib/proxy-model.ts)
for a working reference.

## API surface used

Every hook, component, and utility shown here is part of the public API
documented in the root [`README.md`](../README.md#api-reference). If any
example references an export that no longer exists, please
[open an issue](https://github.com/burhanharoon/react-ai-form/issues/new).
