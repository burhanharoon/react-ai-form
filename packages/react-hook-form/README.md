# @react-ai-form/react-hook-form

React Hook Form adapter for react-ai-form. Connects AI hooks to React Hook Form's `setValue`/`trigger` API so AI-generated values flow into your forms automatically.

## Install

```bash
pnpm add @react-ai-form/react-hook-form @react-ai-form/react @react-ai-form/core react-hook-form zod ai react react-dom
```

## Status

This package provides the adapter layer between `@react-ai-form/react` hooks and React Hook Form. It is published and available but the full adapter API is under active development.

The core (`@react-ai-form/core`) and React (`@react-ai-form/react`) packages are fully implemented with hooks, components, and 220+ tests.

## How it will work

```tsx
import { useForm } from "react-hook-form";
import { useAIFormFill } from "@react-ai-form/react";
import { z } from "zod";

const schema = z.object({
  name: z.string().describe("Full name"),
  email: z.string().email().describe("Email address"),
});

function MyForm() {
  const { register, setValue, trigger } = useForm();

  const { fillForm, isFillingForm } = useAIFormFill({
    schema,
    model: openai("gpt-4o"),
    onFieldUpdate: (update) => {
      // AI values flow into React Hook Form
      setValue(update.fieldPath, update.value, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      });
    },
    onComplete: () => {
      // Validate all fields after streaming completes
      trigger();
    },
  });

  return (
    <form>
      <input {...register("name")} />
      <input {...register("email")} />
      <button type="button" onClick={() => fillForm("John Doe, engineer at Acme")}>
        Fill with AI
      </button>
    </form>
  );
}
```

## Related packages

- [`@react-ai-form/core`](https://www.npmjs.com/package/@react-ai-form/core) -- Schema utils, streaming, privacy, caching
- [`@react-ai-form/react`](https://www.npmjs.com/package/@react-ai-form/react) -- React hooks and components

## License

MIT
