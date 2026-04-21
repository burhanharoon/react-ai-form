# @react-ai-form/core

**Provider-agnostic, zero-React core for AI-powered forms.** Pure TypeScript — schema introspection, streaming routers, privacy utilities, and an LRU cache. Runs anywhere JavaScript runs.

[![npm](https://img.shields.io/npm/v/@react-ai-form/core.svg?color=cb3837&label=npm)](https://www.npmjs.com/package/@react-ai-form/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@react-ai-form/core.svg?label=min%2Bgzip)](https://bundlephobia.com/package/@react-ai-form/core)
[![license](https://img.shields.io/npm/l/@react-ai-form/core.svg)](./package.json)

> 🧪 See it in action at **https://react-ai-form.vercel.app** ([source](../../apps/demo)).

## When to use this package

Install `@react-ai-form/core` directly **only if you need schema / privacy utilities in Node or a non-React environment** (e.g., server-side PII redaction, schema-to-prompt generation in a background job). If you're building a React app, you almost certainly want [`@react-ai-form/react`](../react) or [`@react-ai-form/react-hook-form`](../react-hook-form) — both re-export everything you need from here.

## Install

```bash
pnpm add @react-ai-form/core zod ai
```

`zod` and `ai` are peer dependencies and must be installed separately.

## API

### Schema Utilities

**`extractFieldMeta(schema)`** -- Walk a Zod schema and extract metadata (name, path, type, description, constraints, enums) for each field.

**`schemaToSystemPrompt(schema, options?)`** -- Generate an LLM system prompt from a Zod schema that instructs the model to return valid JSON matching field names, types, and constraints.

**`filterSchemaByPrivacy(schema, config)`** -- Return a new Zod schema with high-sensitivity fields removed.

### Streaming

**`createFieldRouter(schema)`** -- Create a stateful router that diffs streaming partial JSON objects and emits per-field update events.

- `.update(partialObject)` -- Feed a new snapshot, get back changed fields
- `.subscribe(fieldPath, callback)` -- Listen to a specific field
- `.subscribeAll(callback)` -- Listen to all field changes
- `.getSnapshot()` -- Current accumulated state
- `.complete()` -- Mark all fields as done

**`diffPartialObjects(prev, next)`** -- Pure function to diff two partial objects and return field updates.

### Privacy

**`redactPII(text)`** -- Detect and replace emails, phones, SSNs, credit cards, IPs with reversible placeholders.

**`rehydratePII(text, mapping)`** -- Restore original values from placeholders.

**`classifyFieldSensitivity(fieldMeta)`** -- Auto-detect sensitivity from field name/description (high/low/none).

**`sanitizeFormDataForAI(data, schema, config)`** -- Remove high-sensitivity fields, redact PII in low-sensitivity fields, pass through the rest.

**`getFieldPrivacyConfig(fieldPath, config)`** -- Get merged privacy config for a field.

**`isFieldAIEnabled(fieldPath, config)`** -- Quick check if AI can process a field.

### Cache

**`createAICache(options?)`** -- LRU cache with TTL expiration for AI responses.

**`createCacheKey({ schema, context, fieldPath? })`** -- Deterministic cache key from schema + context.

### Types

`AIFieldConfig`, `AIFormConfig`, `AIFieldMeta`, `AIFieldUpdate`, `AIFillResult`, `AIFieldError`, `AIFormError`, `AIProvider`, `DeepPartial`, `FieldRouter`, `AICache`

## License

MIT
