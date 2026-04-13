# react-ai-form

Enhance your React forms with AI capabilities. Connect LLM providers to React form libraries using Zod schemas as the single source of truth for both validation and structured AI output.

## Features

- **Zod-first** -- same schema validates your form AND constrains LLM output
- **Streaming** -- AI responses populate fields in real-time as tokens arrive
- **Privacy-first** -- fields can opt out of AI processing; sensitive data never sent to LLMs
- **Provider agnostic** -- works with any Vercel AI SDK provider (OpenAI, Anthropic, Google, Ollama)
- **Form-library agnostic** -- core logic has zero React/form dependencies
- **Progressive enhancement** -- forms work without AI; AI features are additive

## Packages

| Package | Description | Status |
|---------|-------------|--------|
| [`@react-ai-form/core`](packages/core) | Schema utils, streaming router, privacy, caching | v1 complete |
| [`@react-ai-form/react`](packages/react) | React hooks and components | Coming soon |
| [`@react-ai-form/react-hook-form`](packages/react-hook-form) | React Hook Form adapter | Coming soon |

## Quick Start

```bash
pnpm add @react-ai-form/core zod ai
```

```typescript
import { z } from "zod";
import {
  extractFieldMeta,
  schemaToSystemPrompt,
  filterSchemaByPrivacy,
  createFieldRouter,
  redactPII,
  createAICache,
} from "@react-ai-form/core";

// Define your form schema -- Zod is the single source of truth
const contactSchema = z.object({
  name: z.string().describe("Full name"),
  email: z.string().email().describe("Email address"),
  company: z.string().describe("Company name"),
  ssn: z.string().describe("Social security number"),
});

// Configure privacy -- SSN is never sent to the LLM
const config = {
  fields: {
    ssn: { aiEnabled: false, sensitivity: "high" as const },
  },
};

// Filter sensitive fields before building the LLM prompt
const safeSchema = filterSchemaByPrivacy(contactSchema, config);
const prompt = schemaToSystemPrompt(safeSchema, {
  context: "The user is John Doe, a senior engineer at Acme Corp",
});

// Route streaming responses to individual form fields
const router = createFieldRouter(safeSchema);
router.subscribe("name", (update) => {
  console.log(`Name updated: ${update.value}`);
});

// Feed partial objects as they stream from the LLM
router.update({ name: "John" });
router.update({ name: "John", email: "john@acme.com" });
```

## Architecture

```
@react-ai-form/core          (zero React dependency)
  schema.ts     -- Zod schema -> LLM prompt + field metadata
  stream.ts     -- Streaming JSON -> per-field update router
  privacy.ts    -- PII detection, field-level privacy
  cache.ts      -- LRU response cache
  types.ts      -- Shared TypeScript interfaces

@react-ai-form/react          (form-library agnostic hooks)
  useAIForm, useAISuggestion, AIFieldSuggestion, etc.

@react-ai-form/react-hook-form (React Hook Form adapter)
  setValue/trigger integration for AI-generated values
```

## Development

```bash
pnpm install       # Install dependencies
pnpm build         # Build all packages
pnpm test          # Run all tests
pnpm lint          # Lint with Biome
pnpm typecheck     # Type-check all packages
pnpm dev           # Watch mode
```

## License

MIT
