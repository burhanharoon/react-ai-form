---
"@react-ai-form/core": patch
"@react-ai-form/react": patch
"@react-ai-form/react-hook-form": patch
---

Tighten build output: tsup now minifies, targets ES2022, enables explicit tree-shaking, and externalises every peer/workspace dependency. Each package declares `sideEffects` correctly — `false` for core and the RHF adapter, `["**/*.css"]` for the React package so bundlers preserve the ghost-text and filler-button styles. No API changes.

Measured gzipped sizes after these changes (ESM, peers ignored):

- `@react-ai-form/core` — 3.40 KB
- `@react-ai-form/react` (includes core) — 6.94 KB
- `@react-ai-form/react-hook-form` (full stack when imported alone) — 8.12 KB

A new `size-limit` CI guard enforces these budgets on every PR, and a
`pnpm check:tree-shake` diagnostic verifies that partial imports prune
unused exports (importing `redactPII` alone from core is 0.38 KB gzip
vs 3.48 KB for `import *`).
