# @react-ai-form/core

## 0.2.4

### Patch Changes

- [#26](https://github.com/burhanharoon/react-ai-form/pull/26) [`54400d8`](https://github.com/burhanharoon/react-ai-form/commit/54400d89b504023acb40a5b40138c1d23d96d6b4) Thanks [@burhanharoon](https://github.com/burhanharoon)! - Tighten build output: tsup now minifies, targets ES2022, enables explicit tree-shaking, and externalises every peer/workspace dependency. Each package declares `sideEffects` correctly — `false` for core and the RHF adapter, `["**/*.css"]` for the React package so bundlers preserve the ghost-text and filler-button styles. No API changes.

  Measured gzipped sizes after these changes (ESM, peers ignored):

  - `@react-ai-form/core` — 3.40 KB
  - `@react-ai-form/react` (includes core) — 6.94 KB
  - `@react-ai-form/react-hook-form` (full stack when imported alone) — 8.12 KB

  A new `size-limit` CI guard enforces these budgets on every PR, and a
  `pnpm check:tree-shake` diagnostic verifies that partial imports prune
  unused exports (importing `redactPII` alone from core is 0.38 KB gzip
  vs 3.48 KB for `import *`).

## 0.2.3

### Patch Changes

- [#23](https://github.com/burhanharoon/react-ai-form/pull/23) [`2d00791`](https://github.com/burhanharoon/react-ai-form/commit/2d0079121c71c253201593a171aa311dd6329611) Thanks [@burhanharoon](https://github.com/burhanharoon)! - Rewrite the root README as a production-quality landing page (badge row, one-screen Quick Start, API reference, recipes, comparison table, privacy section). Add CONTRIBUTING.md. Docs-only; no code changes.

## 0.2.2

### Patch Changes

- [#21](https://github.com/burhanharoon/react-ai-form/pull/21) [`6f7edbb`](https://github.com/burhanharoon/react-ai-form/commit/6f7edbb9599db776a24a407ccfe760503631ef6f) Thanks [@burhanharoon](https://github.com/burhanharoon)! - Add live demo URL (https://react-ai-form.vercel.app) to each package README so it shows up on npmjs.com.

## 0.1.1

### Patch Changes

- [`f492f06`](https://github.com/burhanharoon/react-ai-form/commit/f492f064cebf589c471240aef40708d0fa953c5f) Thanks [@burhanharoon](https://github.com/burhanharoon)! - docs: update package READMEs with full API documentation and usage examples

## 0.1.0

### Minor Changes

- [#7](https://github.com/burhanharoon/react-ai-form/pull/7) [`1c47d75`](https://github.com/burhanharoon/react-ai-form/commit/1c47d75f2ecc459db560dc13674bda21b9b809fe) Thanks [@burhanharoon](https://github.com/burhanharoon)! - feat(react): complete @react-ai-form/react v2

  - AIFormProvider context with optional provider pattern
  - useAISuggestion hook with debounce, caching, abort handling
  - useAIFormFill streaming hook for whole-form AI fill via streamObject
  - AIFieldSuggestion ghost text component (Gmail Smart Compose style)
  - AIFormFillerButton with loading/progress/complete states + headless asChild mode
  - AIConfidenceBadge for AI-filled field confidence indicators
  - Accessibility utilities: useAriaLiveAnnounce, useReducedMotion, useFocusTrap
  - AI_FORM_ARIA_LABELS constant templates
  - 97 tests across 8 test files, WCAG 2.2 AA compliant
  - Updated package metadata with descriptions, repository, keywords
