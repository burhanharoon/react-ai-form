---
"@react-ai-form/react-hook-form": minor
---

Add `useAIForm` hook — flagship integration that wires `useAIFormFill` into a React Hook Form instance. AI-streamed values flow through `setValue` with `{ shouldDirty: true, shouldTouch: true }`, focused and user-edited fields are protected from overwrite, and `form.trigger` runs once after the stream completes. Also exposes an enhanced `register` that adds a `data-ai-status` attribute and focus tracking.
