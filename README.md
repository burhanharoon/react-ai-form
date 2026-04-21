# react-ai-form

**AI-powered form filling, ghost-text suggestions, and smart validation for React.**

[![npm](https://img.shields.io/npm/v/@react-ai-form/react-hook-form.svg?color=cb3837&label=npm)](https://www.npmjs.com/package/@react-ai-form/react-hook-form)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@react-ai-form/react-hook-form.svg?label=min%2Bgzip)](https://bundlephobia.com/package/@react-ai-form/react-hook-form)
[![license](https://img.shields.io/npm/l/@react-ai-form/react-hook-form.svg)](./packages/react-hook-form/package.json)
[![types](https://img.shields.io/npm/types/@react-ai-form/react-hook-form.svg)](#api-reference)
[![CI](https://github.com/burhanharoon/react-ai-form/actions/workflows/ci.yml/badge.svg)](https://github.com/burhanharoon/react-ai-form/actions/workflows/ci.yml)

One Zod schema. One hook. Your React Hook Form becomes an AI-assisted form — streaming fill, ghost-text suggestions, field-level privacy — without rewriting a single input.

<!-- TODO: record demo GIF and replace this alt text + path -->
[![Contact form demo — type a context, click Fill with AI, every field streams in](./docs/demo.gif)](https://react-ai-form.vercel.app)

> Live demo: **https://react-ai-form.vercel.app** · source in [apps/demo](apps/demo).

---

## Quick Start

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAIForm } from "@react-ai-form/react-hook-form";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).describe("Full name"),
  email: z.string().email().describe("Email address"),
  company: z.string().min(1).describe("Company name"),
});

type Contact = z.infer<typeof schema>;

export function ContactForm() {
  const form = useForm<Contact>({
    defaultValues: { name: "", email: "", company: "" },
    resolver: zodResolver(schema),
  });

  const { register, fillForm, isFillingForm, progress } = useAIForm(form, {
    schema,
    model: openai("gpt-4o-mini"),
  });

  return (
    <form onSubmit={form.handleSubmit((data) => console.log(data))}>
      <input {...register("name")} placeholder="Full name" />
      <input {...register("email")} placeholder="Email" />
      <input {...register("company")} placeholder="Company" />
      <button type="button" onClick={() => fillForm("CTO at Acme Corp")} disabled={isFillingForm}>
        {isFillingForm ? `Filling ${progress.filled}/${progress.total}…` : "✨ Fill with AI"}
      </button>
    </form>
  );
}
```

That's it. `useAIForm` wires streaming AI output into RHF `setValue` with `{ shouldDirty: true, shouldTouch: true, shouldValidate: false }`, awaits `form.trigger()` after the stream finishes so `formState.errors` is current, and protects any field the user is actively editing from being overwritten.

---

## Features

- ✨ **One-click form fill** — populate whole forms from a plain-English context
- 👻 **Ghost-text suggestions** — Gmail Smart Compose-style inline completions
- 🔒 **Privacy-first** — field-level AI opt-out plus reversible PII redaction
- 🌊 **Streaming** — fields populate in real-time as tokens arrive
- 📋 **Schema-driven** — one Zod schema validates the form and constrains AI output
- 🔌 **Provider-agnostic** — OpenAI, Anthropic, Google, Ollama via the Vercel AI SDK
- ♿ **Accessible** — WCAG 2.2 AA, keyboard-first, screen-reader announcements
- 📦 **Composable** — headless hooks plus optional styled components
- 🧪 **Works offline** — demo runs with zero credentials via hardcoded streaming fixtures

---

## Demo

Three interactive examples live in [apps/demo](apps/demo):

- **One-click form fill** — `streamObject`-backed contact form.
- **Ghost-text suggestions** — Gmail-style per-field autocomplete.
- **Bio-to-application** — PII-redacted LinkedIn bio → 9-field application.

Run locally:

```bash
pnpm install
pnpm build --filter='@react-ai-form/*'
pnpm --filter demo dev
```

Open http://localhost:3000. No `OPENAI_API_KEY` needed — the server falls back to hardcoded streaming fixtures. Set the key to hit real `gpt-4o-mini`.

---

## Examples

Self-contained, copy-paste-ready files for each feature live in [`examples/`](./examples/). Drop any one into a Next.js page or `src/App.tsx` and it runs.

| # | File | What it shows |
|---|------|---------------|
| 01 | [basic-form-fill](./examples/01-basic-form-fill.tsx) | Simplest `useAIForm` + `fillForm` integration |
| 02 | [ghost-text-suggestions](./examples/02-ghost-text-suggestions.tsx) | Gmail-style per-field autocomplete |
| 03 | [privacy-config](./examples/03-privacy-config.tsx) | Sensitive-field opt-out + PII redaction |
| 04 | [shadcn-ui-integration](./examples/04-shadcn-ui-integration.tsx) | `useAIForm` inside shadcn/ui `Form` |
| 05 | [streaming-progress](./examples/05-streaming-progress.tsx) | Progress bar + per-field flash via `data-ai-status` |
| 06 | [custom-provider-ollama](./examples/06-custom-provider-ollama.tsx) | Local Ollama model, no data leaves the machine |
| 07 | [multi-step-form](./examples/07-multi-step-form.tsx) | Wizard flow with `z.extend()` schema composition |
| 08 | [natural-language-fill](./examples/08-natural-language-fill.tsx) | Free text → structured flight-booking fields |

See [`examples/README.md`](./examples/README.md) for setup instructions.

---

## Installation

Three packages, pick what you need:

| Using… | Install |
|---|---|
| **React Hook Form** (recommended) | `@react-ai-form/react-hook-form` |
| TanStack Form / plain React state | `@react-ai-form/react` |
| Node-only (server-side schema utils) | `@react-ai-form/core` |

The React Hook Form package re-exports everything from the React package, so you only install one.

```bash
# pnpm
pnpm add @react-ai-form/react-hook-form react-hook-form zod ai @ai-sdk/openai @hookform/resolvers

# npm
npm install @react-ai-form/react-hook-form react-hook-form zod ai @ai-sdk/openai @hookform/resolvers

# yarn
yarn add @react-ai-form/react-hook-form react-hook-form zod ai @ai-sdk/openai @hookform/resolvers
```

**Peer dependencies** — `react ^18.0 || ^19.0`, `react-dom ^18.0 || ^19.0`, `zod ^3.23`, `ai ^4.0`, `react-hook-form ^7.50` (adapter package only).

---

## Packages

| Package | Description | npm |
|---|---|---|
| [`@react-ai-form/core`](packages/core) | Schema utils, streaming router, privacy, caching | [![npm](https://img.shields.io/npm/v/@react-ai-form/core)](https://www.npmjs.com/package/@react-ai-form/core) |
| [`@react-ai-form/react`](packages/react) | React hooks and components | [![npm](https://img.shields.io/npm/v/@react-ai-form/react)](https://www.npmjs.com/package/@react-ai-form/react) |
| [`@react-ai-form/react-hook-form`](packages/react-hook-form) | React Hook Form adapter | [![npm](https://img.shields.io/npm/v/@react-ai-form/react-hook-form)](https://www.npmjs.com/package/@react-ai-form/react-hook-form) |

---

## API Reference

### Hooks

#### `useAIForm(form, options)`

Flagship hook — wraps `useAIFormFill` around an existing RHF `useForm` instance. AI values flow through `setValue` with dirty tracking; the currently-focused (or previously-edited) field is protected from overwrite.

```ts
function useAIForm<T extends ZodObject>(
  form: UseFormReturn<z.infer<T>>,
  options: UseAIFormOptions<T>,
): UseAIFormReturn<T>
```

**Options**

| Option | Type | Notes |
|---|---|---|
| `schema` | `ZodObject` | Same schema your resolver uses. Required. |
| `model` | `LanguageModelV1` | Any Vercel AI SDK model. Can come from `AIFormProvider` instead. |
| `apiEndpoint` | `string` | Optional custom streaming endpoint for server-side proxies. |
| `config` | `AIFormConfig` | Per-field privacy, debounce, cache overrides. |
| `onFillComplete` | `(result: AIFillResult) => void` | Fired **after** post-fill validation settles. |
| `onError` | `(error: AIFormError) => void` | Fired on stream failure. |

**Returns**

Everything `useAIFormFill` returns (`fillForm`, `fillFromData`, `isFillingForm`, `progress`, `filledFields`, `error`, `abort`, `getFieldStatus`, `markUserModified`) plus:

- `register(name, options?)` — RHF's `register` enhanced with focus tracking, immediate `markUserModified` on change, and a `data-ai-status="empty | ai-filled | user-modified"` attribute for CSS targeting.
- `reset(options?)` — clears AI state; pass `{ clearValues: true }` to also call `form.reset()`.

```tsx
const { register, fillForm, progress } = useAIForm(form, { schema, model: openai("gpt-4o-mini") });

<input {...register("company")} />
<button onClick={() => fillForm("CTO at Stripe")}>Fill</button>
```

---

#### `useAIFormFill(options)`

Form-library-agnostic streaming fill. Use this directly with TanStack Form, `useState`, or any other form library — receive field updates via `onFieldUpdate` and route them wherever you need.

```ts
function useAIFormFill<T extends ZodObject>(options: UseAIFormFillOptions<T>): UseAIFormFillReturn<T>
```

**Options** — same as `useAIForm` but with `onFieldUpdate: (update: AIFieldUpdate) => void` instead of the RHF-specific `onFillComplete`.

**Returns**

| Property | Type |
|---|---|
| `fillForm` | `(context: string) => Promise<AIFillResult>` |
| `fillFromData` | `(data: Partial<z.infer<T>>) => void` |
| `isFillingForm` | `boolean` |
| `progress` | `{ filled: number; total: number }` |
| `filledFields` | `Set<string>` |
| `error` | `AIFormError \| null` |
| `abort` | `() => void` |
| `reset` | `() => void` |
| `markUserModified` | `(fieldPath: string) => void` |
| `getFieldStatus` | `(path: string) => "empty" \| "ai-filled" \| "user-modified"` |

```tsx
const { fillForm, isFillingForm } = useAIFormFill({
  schema,
  model: openai("gpt-4o-mini"),
  onFieldUpdate: (u) => setValues((prev) => ({ ...prev, [u.fieldPath]: u.value })),
});
```

---

#### `useAISuggestion(options)`

Per-field AI suggestion — debounced requests, abort-on-change, LRU caching, optional blur-triggered mode.

```ts
function useAISuggestion(options: UseAISuggestionOptions): UseAISuggestionReturn
```

**Options**

| Option | Type | Default | Notes |
|---|---|---|---|
| `fieldName` | `string` | — | Used in the prompt and cache key. |
| `value` | `string` | — | Current field value. Drives the debounced fetch. |
| `context` | `Record<string, unknown>` | — | Other form values to send as context. |
| `schema` | `ZodType` | — | Optional per-field schema for type hints. |
| `model` | `LanguageModelV1` | provider | Override the provider-level model. |
| `enabled` | `boolean` | `true` | Disable without unmounting the hook. |
| `debounceMs` | `number` | `400` | Delay after last keystroke before fetching. |
| `minChars` | `number` | `3` | Minimum length before any fetch fires. |
| `triggerMode` | `"typing" \| "blur" \| "manual"` | `"typing"` | When to fetch. |

**Returns** — `{ suggestion, isLoading, error, accept, dismiss, refresh, handleBlur }`. `accept()` returns the combined `value + suggestion` string.

```tsx
const { suggestion, accept, dismiss, isLoading } = useAISuggestion({
  fieldName: "description",
  value,
});
```

---

#### `useAIFormContext()` and `useResolvedConfig(hookProps?)`

Low-level provider hooks for people building custom hooks on top of `AIFormProvider`.

- `useAIFormContext()` — throws if called outside a provider. Reach for this when the provider is mandatory.
- `useResolvedConfig(hookProps?)` — merges `hookProps > context > defaults`. Used internally by every other hook so they work with or without a provider.

---

### Components

#### `AITextField`

Pre-composed labelled input: ghost-text suggestions + confidence badge + inline error message. The fastest path to a working AI-enabled field.

```tsx
<AITextField form={form} name="company" label="Company" placeholder="e.g. Stripe" aiSuggestion />
```

**Props** — `form`, `name`, `label`, `placeholder`, `type?: "text" | "email" | "url" | "tel"`, `aiSuggestion?: boolean`, `aiBadge?: boolean`, `className?: string`. `name` is type-constrained to string-valued field paths via `FieldPathByValue<TFieldValues, string>`.

---

#### `AIFormField`

Render-prop version of `AITextField` — you control the layout, the hook gives you `field`, `fieldState`, `suggestion`, `aiStatus`, `acceptSuggestion`, `dismissSuggestion`.

```tsx
<AIFormField
  form={form}
  name="company"
  aiSuggestion
  render={({ field, suggestion, aiStatus, acceptSuggestion, dismissSuggestion }) => (
    <div>
      <AIFieldSuggestion
        {...field}
        suggestion={suggestion}
        onAccept={acceptSuggestion}
        onDismiss={dismissSuggestion}
      />
      <AIConfidenceBadge status={aiStatus} />
    </div>
  )}
/>
```

---

#### `AIFieldSuggestion`

Gmail-style ghost-text overlay. Transparent `<input>` on top, gray suggestion span behind it. `forwardRef`-ed, extends `InputHTMLAttributes<HTMLInputElement>` so every native prop passes through.

**Required props**: `suggestion: string | null`, `onAccept: () => void`.
**Optional**: `onDismiss`, `isLoading`, `acceptKey?: "Tab" | "ArrowRight" | "Enter"` (default `"Tab"`), `showShortcutHint?: boolean` (default `true`), `suggestionClassName?: string`.

Announces new suggestions via `aria-live="polite"`. Escape dismisses, Tab accepts.

---

#### `AIFormFillerButton`

"Fill with AI" button with built-in state machine: idle → loading with progress → "Filled!" confirmation → reset. Supports headless `asChild` mode for wrapping your own button.

```tsx
<AIFormFillerButton
  asChild
  onFill={() => fillForm("some context")}
  isLoading={isFillingForm}
  progress={progress}
>
  <MyButton>Fill with AI</MyButton>
</AIFormFillerButton>
```

**Props**: `onFill`, `isLoading?`, `progress?`, `disabled?`, `variant?: "default" | "icon" | "minimal"`, `size?: "sm" | "md" | "lg"`, `asChild?`, `children?`, `className?`.

---

#### `AIConfidenceBadge`

Status pill that renders different content for each field state. Returns `null` when `status === "empty"` so you can render it unconditionally.

```tsx
<AIConfidenceBadge status={getFieldStatus("email")} size="sm" />
```

**Props**: `status: "ai-filled" | "user-modified" | "empty"`, `confidence?: "high" | "medium" | "low"`, `size?: "sm" | "md"`, `showLabel?: boolean`, `className?: string`.

---

#### `AIFormProvider` and `AIFormStatusProvider`

- `AIFormProvider` — optional context carrying a shared `model`, `apiEndpoint`, `config`, and cache. Every hook accepts the same props directly, so the provider is genuinely optional.
- `AIFormStatusProvider` — passes the current `getFieldStatus` lookup down the tree so descendant `AITextField` / `AIFormField` components render correct status without prop drilling.

```tsx
<AIFormProvider model={openai("gpt-4o-mini")} config={{ debounceMs: 300 }}>
  <AIFormStatusProvider getFieldStatus={ai.getFieldStatus}>
    <App />
  </AIFormStatusProvider>
</AIFormProvider>
```

---

### Core utilities

Exported from `@react-ai-form/core`. Provider-agnostic, zero React dependency — also usable in Node.

- **`redactPII(text)`** → `{ redacted, mapping }` — replaces emails, phone numbers, SSNs, credit cards, and IPs with reversible placeholders.
- **`rehydratePII(text, mapping)`** — restores originals from placeholders.
- **`sanitizeFormDataForAI(data, schema, config)`** — drops high-sensitivity fields entirely, redacts PII in low-sensitivity strings, returns `{ sanitized, redactedFields, mapping }`.
- **`filterSchemaByPrivacy(schema, config)`** → new Zod schema with sensitive fields removed.
- **`schemaToSystemPrompt(schema)`** — builds an LLM system prompt from a Zod schema.
- **`createFieldRouter(schema)`** — streams partial JSON into per-field update events for custom UIs.

See [`packages/core/README.md`](packages/core/README.md) for signatures.

---

## Recipes

### Fill a form from pasted text with PII redaction

```tsx
import { redactPII } from "@react-ai-form/core";
import { useAIForm } from "@react-ai-form/react-hook-form";

function Application({ form, bio }: { form: UseFormReturn<AppForm>; bio: string }) {
  const ai = useAIForm(form, { schema: appSchema, model: openai("gpt-4o-mini") });

  const autoFill = async () => {
    const { redacted, mapping } = redactPII(bio);
    await ai.fillForm(redacted);
    console.log(`Redacted ${mapping.size} PII values before the AI saw the text.`);
  };

  return <button onClick={autoFill}>Auto-fill from bio</button>;
}
```

> Why this matters — emails, phones, SSNs, credit cards, and IPs never leave the browser in plaintext. Placeholders are reversible (via `rehydratePII`) if you need to re-inject them locally.

---

### Add ghost text to a single field

```tsx
import { AITextField } from "@react-ai-form/react-hook-form";

<AITextField form={form} name="description" label="Description" aiSuggestion />
```

> Why this matters — works with your existing RHF field, no layout changes. Accept with Tab, dismiss with Escape. Debounced, cached, cancelled-on-change out of the box.

---

### Protect sensitive fields from AI entirely

```tsx
const ai = useAIForm(form, {
  schema,
  model,
  config: {
    fields: {
      ssn: { aiEnabled: false, sensitivity: "high" },
      dob: { aiEnabled: false, sensitivity: "high" },
    },
  },
});
```

> Why this matters — `filterSchemaByPrivacy` is called internally, so high-sensitivity fields are stripped from the schema before the prompt is built. The AI never sees them — not even as empty keys.

---

### Use with shadcn/ui components

```tsx
import { AIFormField } from "@react-ai-form/react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<AIFormField
  form={form}
  name="company"
  render={({ field, fieldState }) => (
    <div className="space-y-1">
      <Label htmlFor={field.name}>Company</Label>
      <Input id={field.name} {...field} />
      {fieldState.error ? (
        <p className="text-sm text-destructive">{fieldState.error.message}</p>
      ) : null}
    </div>
  )}
/>
```

> Why this matters — `AIFormField` gives you the AI wiring, you keep full control over shadcn layout. The full shape is shown in [apps/demo/app/demos/suggestions](apps/demo/app/demos/suggestions).

---

### Use with TanStack Form

```tsx
import { useAIFormFill } from "@react-ai-form/react";
import { useForm } from "@tanstack/react-form";

const form = useForm<Contact>({ defaultValues: { name: "", email: "", company: "" } });

const { fillForm, isFillingForm } = useAIFormFill({
  schema,
  model: openai("gpt-4o-mini"),
  onFieldUpdate: (u) => form.setFieldValue(u.fieldPath as keyof Contact, u.value as never),
});
```

> Why this matters — the React package is form-library agnostic. A dedicated `@react-ai-form/tanstack-form` adapter is on the roadmap; meanwhile `useAIFormFill` + `setFieldValue` is a ~3-line bridge.

---

### Use a local model via Ollama

```tsx
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: "http://localhost:11434/v1",
});

const ai = useAIForm(form, { schema, model: ollama("llama3.1") });
```

> Why this matters — nothing leaves your machine. Note: model-side JSON-mode / function-calling support varies; prefer `llama3.1`, `qwen2.5`, or `mistral-nemo` for structured-output work.

---

## Comparison

| Feature | react-ai-form | [CopilotKit](https://github.com/CopilotKit/CopilotKit) | [AI SDK `useObject`](https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-object) | DIY |
|---|---|---|---|---|
| One-click whole-form fill | ✅ | ❌ | ⚠️¹ | manual |
| Per-field ghost text | ✅ | ✅ | ❌ | manual |
| Privacy / PII redaction | ✅ | ❌ | ❌ | manual |
| Form-library agnostic | ✅ | ❌ | N/A | N/A |
| React Hook Form adapter | ✅ | ❌ | ❌ | manual |
| Streaming / token-level | ✅ | ✅ | ✅ | manual |
| Zod schema = form + AI output | ✅ | ❌ | ⚠️² | manual |
| WCAG 2.2 AA components | ✅ | partial | N/A | manual |
| Open source (MIT) | ✅ | ✅ | ✅ | N/A |

> ¹ `useObject` from `ai/react` streams parsed JSON into component state; wiring that into a form library with dirty tracking, abort, and user-edit protection is on you. `react-ai-form` layers those on top.
>
> ² `useObject` accepts a Zod schema for AI output but doesn't connect it to form validation — you'd still write a separate resolver.

---

## Privacy & Security

`react-ai-form` is opinionated about what leaves the browser.

**Per-field opt-out.** Any field can be marked `sensitivity: "high"` — `filterSchemaByPrivacy` strips it from the schema before the prompt is built, so the AI doesn't even see it exists.

```ts
const config: AIFormConfig = {
  fields: {
    ssn: { aiEnabled: false, sensitivity: "high" },
    dob: { sensitivity: "high" },
  },
};
```

**PII redaction.** `redactPII(text)` detects and replaces emails, phones, SSNs, credit cards, and IPs with deterministic reversible placeholders. You get back a `mapping` you can use with `rehydratePII` to restore originals locally after the AI responds.

```ts
const { redacted, mapping } = redactPII(bio);
//   -> "Reach me at [EMAIL_0] or [PHONE_0]"
await ai.fillForm(redacted);
```

**What actually leaves the browser.** By default, exactly one request per fill: a `streamObject` call to whichever model you pass to `useAIForm`. If you don't want the key in the browser, pass a custom `apiEndpoint` or ship a `LanguageModelV1` shim that proxies through your own server — [apps/demo/lib/proxy-model.ts](apps/demo/lib/proxy-model.ts) is a working copy-paste reference.

**Local-only mode.** Point the model at Ollama ([recipe](#use-a-local-model-via-ollama)) and nothing leaves the machine.

**Data retention.** `react-ai-form` persists nothing. Retention is whatever your model provider's policy says. Caching is in-memory LRU with a configurable TTL.

---

## Contributing

Contributions are welcome — especially for new form-library adapters, model provider integrations, and accessibility improvements. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

Quick loop:

```bash
pnpm install                     # Install dependencies
pnpm dev                         # tsup --watch across all packages
pnpm test                        # Vitest
pnpm lint:fix                    # Biome
pnpm typecheck                   # tsc --noEmit across the workspace
pnpm changeset                   # Create a version bump for user-facing changes
```

---

## License

MIT © [burhanharoon](https://github.com/burhanharoon).

Built with ❤️. Star on GitHub if this helped you!
