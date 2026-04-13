# react-ai-form

Enhance your React forms with AI capabilities. Connect LLM providers to React form libraries using Zod schemas as the single source of truth for both validation and structured AI output.

## Features

- **Zod-first** -- same schema validates your form AND constrains LLM output
- **Streaming** -- AI responses populate fields in real-time as tokens arrive
- **Privacy-first** -- fields can opt out of AI processing; sensitive data never sent to LLMs
- **Provider agnostic** -- works with any Vercel AI SDK provider (OpenAI, Anthropic, Google, Ollama)
- **Form-library agnostic** -- core logic has zero React/form dependencies
- **Accessible** -- WCAG 2.2 AA compliant, full keyboard navigation, screen reader support
- **Progressive enhancement** -- forms work without AI; AI features are additive

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [`@react-ai-form/core`](packages/core) | Schema utils, streaming router, privacy, caching | [![npm](https://img.shields.io/npm/v/@react-ai-form/core)](https://www.npmjs.com/package/@react-ai-form/core) |
| [`@react-ai-form/react`](packages/react) | React hooks and components | [![npm](https://img.shields.io/npm/v/@react-ai-form/react)](https://www.npmjs.com/package/@react-ai-form/react) |
| [`@react-ai-form/react-hook-form`](packages/react-hook-form) | React Hook Form adapter | [![npm](https://img.shields.io/npm/v/@react-ai-form/react-hook-form)](https://www.npmjs.com/package/@react-ai-form/react-hook-form) |

## Quick Start

```bash
pnpm add @react-ai-form/react @react-ai-form/core zod ai
```

### Fill an entire form with AI

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
  const { fillForm, isFillingForm, progress } = useAIFormFill({
    schema,
    model: openai("gpt-4o"),
    onFieldUpdate: (update) => {
      console.log(`${update.fieldPath} = ${update.value}`);
    },
  });

  return (
    <button onClick={() => fillForm("Senior engineer at Acme Corp")} disabled={isFillingForm}>
      {isFillingForm ? `Filling ${progress.filled}/${progress.total}...` : "Fill with AI"}
    </button>
  );
}
```

### Per-field ghost text suggestions

```tsx
import { useAISuggestion, AIFieldSuggestion } from "@react-ai-form/react";

function CompanyField() {
  const [value, setValue] = useState("");
  const { suggestion, accept, dismiss, isLoading } = useAISuggestion({
    fieldName: "company",
    value,
    model: openai("gpt-4o"),
  });

  return (
    <AIFieldSuggestion
      value={value}
      onChange={(e) => setValue(e.target.value)}
      suggestion={suggestion}
      onAccept={() => setValue(accept())}
      onDismiss={dismiss}
      isLoading={isLoading}
    />
  );
}
```

### Privacy-first by default

```typescript
import { filterSchemaByPrivacy, sanitizeFormDataForAI } from "@react-ai-form/core";

const config = {
  fields: {
    ssn: { aiEnabled: false, sensitivity: "high" as const },
    email: { aiEnabled: true, sensitivity: "low" as const },
  },
};

// SSN is removed entirely, email is PII-redacted before sending to the LLM
const safeSchema = filterSchemaByPrivacy(schema, config);
const { sanitized } = sanitizeFormDataForAI(formData, schema, config);
```

## Architecture

```
@react-ai-form/core               (zero React dependency)
  schema.ts    -- Zod schema -> LLM prompt + field metadata
  stream.ts    -- Streaming JSON -> per-field update router
  privacy.ts   -- PII detection, field-level privacy controls
  cache.ts     -- LRU response cache with TTL

@react-ai-form/react              (form-library agnostic)
  useAISuggestion     -- Per-field suggestions with debounce + cache
  useAIFormFill       -- Whole-form streaming fill via streamObject
  AIFieldSuggestion   -- Ghost text overlay component
  AIFormFillerButton  -- "Fill with AI" button with progress
  AIConfidenceBadge   -- AI-filled field indicators
  AIFormProvider      -- Optional shared config context

@react-ai-form/react-hook-form    (React Hook Form adapter)
  setValue/trigger integration for AI-generated values
```

## Development

```bash
pnpm install       # Install dependencies
pnpm build         # Build all packages
pnpm test          # Run all tests (220+)
pnpm lint          # Lint with Biome
pnpm typecheck     # Type-check all packages
pnpm dev           # Watch mode
pnpm changeset     # Create a changeset for version bump
```

## License

MIT
