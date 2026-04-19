# @react-ai-form/react

Headless React hooks and accessible components for AI-powered forms. Form-library agnostic -- works with React Hook Form, TanStack Form, or plain React state.

## Install

```bash
pnpm add @react-ai-form/react @react-ai-form/core zod ai react react-dom
```

`zod`, `ai`, `react`, and `react-dom` are peer dependencies.

## Hooks

### `useAISuggestion` -- Per-field AI suggestions

```tsx
import { useAISuggestion } from "@react-ai-form/react";
import { openai } from "@ai-sdk/openai";

function CompanyField() {
  const [value, setValue] = useState("");

  const { suggestion, accept, dismiss, isLoading, handleBlur } = useAISuggestion({
    fieldName: "company",
    value,
    model: openai("gpt-4o"),
    triggerMode: "typing", // also: "blur", "manual"
  });

  return (
    <div>
      <input value={value} onChange={(e) => setValue(e.target.value)} onBlur={handleBlur} />
      {suggestion && (
        <button onClick={() => setValue(accept())}>Accept: {suggestion}</button>
      )}
    </div>
  );
}
```

**Features:** debounced requests, AbortController cancellation, LRU caching, configurable trigger modes, min char threshold.

### `useAIFormFill` -- Whole-form streaming fill

```tsx
import { useAIFormFill } from "@react-ai-form/react";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const schema = z.object({
  name: z.string().describe("Full name"),
  email: z.string().email().describe("Email address"),
  company: z.string().describe("Company name"),
});

function MyForm() {
  const { fillForm, isFillingForm, progress, abort, getFieldStatus } = useAIFormFill({
    schema,
    model: openai("gpt-4o"),
    onFieldUpdate: (update) => {
      // Set form field values as they stream in
      console.log(`${update.fieldPath} = ${update.value}`);
    },
  });

  return (
    <div>
      <button onClick={() => fillForm("Senior engineer at Acme Corp")} disabled={isFillingForm}>
        {isFillingForm ? `Filling ${progress.filled}/${progress.total}...` : "Fill with AI"}
      </button>
      {isFillingForm && <button onClick={abort}>Cancel</button>}
    </div>
  );
}
```

**Features:** Zod schema-driven streaming via AI SDK `streamObject`, privacy filtering, field-level progress, abort support, user-edit protection during streaming.

### `AIFormProvider` -- Shared configuration (optional)

```tsx
import { AIFormProvider } from "@react-ai-form/react";
import { openai } from "@ai-sdk/openai";

function App() {
  return (
    <AIFormProvider model={openai("gpt-4o")} config={{ debounceMs: 300 }}>
      <MyForm />
    </AIFormProvider>
  );
}
```

The provider is optional. All hooks accept `model` and `config` as direct props too.

### Advanced: reading provider state

Two lower-level hooks are exported for consumers building custom hooks on top of the provider:

- **`useAIFormContext()`** -- access the `AIFormProvider` value directly. Throws if called outside a provider, so reach for this when the provider is required.
- **`useResolvedConfig(hookProps?)`** -- merges `hookProps > context > defaults` into a single `ResolvedConfig`. Returns the resolved `model`, `apiEndpoint`, `config`, and `cache`. Used internally by `useAIFormFill` and `useAISuggestion` so they work with or without a provider — reuse it when writing your own hook with the same behaviour.

## Components

### `AIFieldSuggestion` -- Ghost text overlay

Gmail Smart Compose-style inline suggestions with full keyboard support and ARIA accessibility.

```tsx
import { AIFieldSuggestion } from "@react-ai-form/react";

<AIFieldSuggestion
  value={value}
  onChange={(e) => setValue(e.target.value)}
  suggestion={suggestion}
  onAccept={handleAccept}
  onDismiss={handleDismiss}
  isLoading={isLoading}
  acceptKey="Tab" // Tab, ArrowRight, or Enter
/>
```

- Two-layer CSS: transparent input over gray suggestion span
- Keyboard: Tab to accept, Escape to dismiss, ArrowRight at end to accept
- Accessible: `aria-live` announcements, `aria-describedby` instructions
- Themeable via CSS variables: `--ai-form-suggestion-color`, `--ai-form-suggestion-bg`

### `AIFormFillerButton` -- "Fill with AI" button

```tsx
import { AIFormFillerButton } from "@react-ai-form/react";

<AIFormFillerButton
  onFill={() => fillForm("context")}
  isLoading={isFillingForm}
  progress={progress}
  variant="default" // "default", "icon", "minimal"
/>
```

States: idle -> loading with progress -> "Filled!" confirmation -> reset. Supports headless mode via `asChild` prop.

### `AIConfidenceBadge` -- Field status indicator

```tsx
import { AIConfidenceBadge } from "@react-ai-form/react";

<AIConfidenceBadge status="ai-filled" confidence="high" />
<AIConfidenceBadge status="user-modified" />
<AIConfidenceBadge status="empty" /> {/* renders null */}
```

## Accessibility Utilities

```tsx
import {
  useAriaLiveAnnounce,
  useReducedMotion,
  useFocusTrap,
  AI_FORM_ARIA_LABELS,
} from "@react-ai-form/react";
```

- `useAriaLiveAnnounce()` -- screen reader announcements with debounce
- `useReducedMotion()` -- respects `prefers-reduced-motion`
- `useFocusTrap(ref, active)` -- keyboard focus trap for dropdowns
- `AI_FORM_ARIA_LABELS` -- standard ARIA label templates

## WCAG 2.2 AA

All components are WCAG 2.2 AA compliant:
- `aria-live="polite"` for suggestion announcements
- `aria-hidden="true"` on visual-only ghost text
- Full keyboard navigation (Tab, Escape, ArrowRight)
- `prefers-reduced-motion` respected in all animations
- 98 tests covering accessibility behavior

## License

MIT
