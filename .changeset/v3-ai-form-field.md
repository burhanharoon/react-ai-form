---
"@react-ai-form/react-hook-form": minor
---

Add `AIFormField` (render-prop) and `AITextField` (pre-composed) wrapper components, plus an optional `AIFormStatusProvider` context. `AIFormField` wires `useAISuggestion` into a single React Hook Form field and exposes `field`, `fieldState`, `suggestion`, `aiStatus`, and `acceptSuggestion`/`dismissSuggestion` to a render prop. `AITextField` renders a labelled input with ghost-text + confidence badge + inline error message in one shot. `AIFormStatusProvider` lets nested fields derive their AI status from a parent `useAIForm` instance without prop-drilling.
