# @react-ai-form/react-hook-form

React Hook Form adapter for react-ai-form. Drop in `useAIForm` to make AI-generated values flow into your RHF form with proper dirty tracking, post-fill validation, and protection for the fields the user is actively editing.

## Install

```bash
pnpm add @react-ai-form/react-hook-form react-hook-form zod ai react react-dom
```

`react-hook-form`, `zod`, `ai`, `react`, and `react-dom` are peer dependencies.

The package re-exports everything from `@react-ai-form/react`, so you don't need to install both — one import path covers the full library.

## Quick start

### `useAIForm` — fill an entire form with AI

```tsx
import { useForm } from "react-hook-form";
import { useAIForm } from "@react-ai-form/react-hook-form";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const schema = z.object({
  name: z.string().describe("Full name"),
  email: z.string().email().describe("Email address"),
  company: z.string().describe("Company name"),
});

function ContactForm() {
  const form = useForm<z.infer<typeof schema>>({
    defaultValues: { name: "", email: "", company: "" },
  });

  const { fillForm, register, isFillingForm, progress } = useAIForm(form, {
    schema,
    model: openai("gpt-4o"),
  });

  return (
    <form onSubmit={form.handleSubmit(console.log)}>
      <input {...register("name")} />
      <input {...register("email")} />
      <input {...register("company")} />
      <button
        type="button"
        onClick={() => fillForm("Ada Lovelace, engineer at Analytical Engine Co.")}
        disabled={isFillingForm}
      >
        {isFillingForm ? `Filling ${progress.filled}/${progress.total}…` : "Fill with AI"}
      </button>
    </form>
  );
}
```

That's it. `useAIForm` wires the streaming fill into RHF's `setValue` with `{ shouldDirty: true, shouldTouch: true }`, awaits `form.trigger()` once after the stream completes, and protects the field the user is focused on (or has already edited) from being overwritten mid-stream.

The enhanced `register` adds a `data-ai-status` attribute (`empty | ai-filled | user-modified`) for CSS targeting and forwards all of RHF's `RegisterOptions` — so `register("age", { valueAsNumber: true })` still works.

### `AIFormField` — render-prop wrapper for per-field ghost text

```tsx
import { AIFormField, AIFieldSuggestion, AIConfidenceBadge } from "@react-ai-form/react-hook-form";

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
/>;
```

`AIFormField` runs `useAISuggestion` internally for the named field and hands you everything you need for the layout — you keep full control over how it's rendered. The generic is constrained to `FieldPathByValue<TFieldValues, string>`, so TypeScript stops you from pointing it at a non-string field.

### `AITextField` — batteries-included labelled input

```tsx
import { AITextField } from "@react-ai-form/react-hook-form";

<AITextField
  form={form}
  name="company"
  label="Company"
  placeholder="e.g. Acme Corp"
  aiSuggestion
/>;
```

Renders a `<label>`, a ghost-text-capable input, a confidence badge, and an inline error message — all wired to the RHF field. Use `AIFormField` when you want the layout; reach for `AITextField` when you want the fastest path to a working UI.

### `AIFormStatusProvider` — derive status without prop-drilling

```tsx
import { AIFormStatusProvider, AITextField } from "@react-ai-form/react-hook-form";

const { getFieldStatus } = useAIForm(form, { schema, model });

<AIFormStatusProvider getFieldStatus={getFieldStatus}>
  <AITextField form={form} name="name" label="Name" />
  <AITextField form={form} name="company" label="Company" />
</AIFormStatusProvider>;
```

Any descendant `AIFormField` / `AITextField` automatically shows the right `aiStatus` (empty / ai-filled / user-modified) without having to thread the status lookup through props.

## API

### `useAIForm(form, options)`

| Option | Type | Notes |
|---|---|---|
| `schema` | `ZodObject` | Same Zod schema you built the resolver with. |
| `model` | `LanguageModelV1` | Vercel AI SDK model. |
| `apiEndpoint` | `string` | Optional custom streaming endpoint. |
| `config` | `AIFormConfig` | Per-field privacy, debounce, cache overrides. |
| `onFillComplete(result)` | callback | Fired **after** post-fill validation settles, so `form.formState.errors` is current. |
| `onError(err)` | callback | Fired if streaming fails. |

Returns everything `useAIFormFill` returns (`fillForm`, `isFillingForm`, `progress`, `filledFields`, `error`, `abort`, `getFieldStatus`, `markUserModified`) plus:

- **`register(name, options?)`** — RHF's `register` wrapped with focus/blur tracking, immediate `markUserModified` on `onChange`, and a `data-ai-status` attribute. Accepts the full `RegisterOptions`.
- **`reset(options?)`** — clears AI fill state (filled fields, user-modified set, error). Pass `{ clearValues: true }` to also call `form.reset()`.

### `AIFormField` / `AITextField`

Both are generic over your form shape and constrained to string-typed field paths (`FieldPathByValue<TFieldValues, string>`). `AIFormField` gives you a render prop; `AITextField` extends it with `label`, `placeholder`, `type`, `aiBadge`, and `className`.

### Re-exports

Everything from `@react-ai-form/react` — `useAIFormFill`, `useAISuggestion`, `AIFieldSuggestion`, `AIFormFillerButton`, `AIConfidenceBadge`, `AIFormProvider`, and the a11y utilities — is re-exported so you can import from one place.

## Accessibility

Same WCAG 2.2 AA guarantees as `@react-ai-form/react`:

- Ghost-text suggestions announce via `aria-live="polite"`
- `aria-describedby` wires keyboard instructions (Tab to accept, Escape to dismiss)
- Full keyboard flow (Tab / ArrowRight / Escape)
- `prefers-reduced-motion` respected throughout

## Related packages

- [`@react-ai-form/core`](https://www.npmjs.com/package/@react-ai-form/core) — Schema utils, streaming, privacy, caching (zero React dependency)
- [`@react-ai-form/react`](https://www.npmjs.com/package/@react-ai-form/react) — Form-library-agnostic React hooks and components

## License

MIT
