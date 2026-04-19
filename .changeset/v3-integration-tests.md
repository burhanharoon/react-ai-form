---
"@react-ai-form/react-hook-form": minor
---

End-to-end integration tests for the full Zod → AI → streaming → RHF → validation pipeline, plus an index export overhaul. The package now re-exports everything from `@react-ai-form/react` (hooks, provider, components, types) so consumers can import from a single entry point. 11 integration scenarios cover complete fill flow, streaming progress, privacy/PII exclusion, user-edit preservation during streams, abort, nested paths, post-fill validation, multi-fill abort semantics, error recovery, and fill-complete callbacks.
