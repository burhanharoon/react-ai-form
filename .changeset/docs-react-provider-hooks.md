---
"@react-ai-form/react": patch
---

Document the `useAIFormContext()` and `useResolvedConfig()` hooks in the README. Both have always been public exports from `src/index.ts` but the README only covered the higher-level `useAISuggestion` / `useAIFormFill` / `AIFormProvider` surface. The new "Advanced: reading provider state" subsection explains when to reach for each and what they return — useful for anyone building custom hooks on top of `AIFormProvider`.
