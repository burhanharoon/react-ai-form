# @react-ai-form/react-hook-form

## 0.2.3

### Patch Changes

- [#23](https://github.com/burhanharoon/react-ai-form/pull/23) [`2d00791`](https://github.com/burhanharoon/react-ai-form/commit/2d0079121c71c253201593a171aa311dd6329611) Thanks [@burhanharoon](https://github.com/burhanharoon)! - Rewrite the root README as a production-quality landing page (badge row, one-screen Quick Start, API reference, recipes, comparison table, privacy section). Add CONTRIBUTING.md. Docs-only; no code changes.

- Updated dependencies [[`2d00791`](https://github.com/burhanharoon/react-ai-form/commit/2d0079121c71c253201593a171aa311dd6329611)]:
  - @react-ai-form/react@0.2.3

## 0.2.2

### Patch Changes

- [#21](https://github.com/burhanharoon/react-ai-form/pull/21) [`6f7edbb`](https://github.com/burhanharoon/react-ai-form/commit/6f7edbb9599db776a24a407ccfe760503631ef6f) Thanks [@burhanharoon](https://github.com/burhanharoon)! - Add live demo URL (https://react-ai-form.vercel.app) to each package README so it shows up on npmjs.com.

- Updated dependencies [[`6f7edbb`](https://github.com/burhanharoon/react-ai-form/commit/6f7edbb9599db776a24a407ccfe760503631ef6f)]:
  - @react-ai-form/react@0.2.2

## 0.2.1

### Patch Changes

- [`efc93a4`](https://github.com/burhanharoon/react-ai-form/commit/efc93a419c25157a04d478b27f0f3304fe347f35) Thanks [@burhanharoon](https://github.com/burhanharoon)! - Rewrite README to document the v3 adapter API (`useAIForm`, `AIFormField`, `AITextField`, `AIFormStatusProvider`). The previous README still described the package as "under active development" and showed the pre-v3 manual `setValue` / `trigger` pattern.

- Updated dependencies [[`efc93a4`](https://github.com/burhanharoon/react-ai-form/commit/efc93a419c25157a04d478b27f0f3304fe347f35)]:
  - @react-ai-form/react@0.2.1

## 0.2.0

### Minor Changes

- [#14](https://github.com/burhanharoon/react-ai-form/pull/14) [`07ca5f1`](https://github.com/burhanharoon/react-ai-form/commit/07ca5f118fdd45f0b69d39be2906fe33994ba56d) Thanks [@burhanharoon](https://github.com/burhanharoon)! - Add `AIFormField` (render-prop) and `AITextField` (pre-composed) wrapper components, plus an optional `AIFormStatusProvider` context. `AIFormField` wires `useAISuggestion` into a single React Hook Form field and exposes `field`, `fieldState`, `suggestion`, `aiStatus`, and `acceptSuggestion`/`dismissSuggestion` to a render prop. `AITextField` renders a labelled input with ghost-text + confidence badge + inline error message in one shot. `AIFormStatusProvider` lets nested fields derive their AI status from a parent `useAIForm` instance without prop-drilling.

- [#15](https://github.com/burhanharoon/react-ai-form/pull/15) [`5c1909a`](https://github.com/burhanharoon/react-ai-form/commit/5c1909ab2208d1137c293d124344299a341f414d) Thanks [@burhanharoon](https://github.com/burhanharoon)! - End-to-end integration tests for the full Zod → AI → streaming → RHF → validation pipeline, plus an index export overhaul. The package now re-exports everything from `@react-ai-form/react` (hooks, provider, components, types) so consumers can import from a single entry point. 11 integration scenarios cover complete fill flow, streaming progress, privacy/PII exclusion, user-edit preservation during streams, abort, nested paths, post-fill validation, multi-fill abort semantics, error recovery, and fill-complete callbacks.

- [#10](https://github.com/burhanharoon/react-ai-form/pull/10) [`e99bd61`](https://github.com/burhanharoon/react-ai-form/commit/e99bd61c3b6669d8d3aa01ad5f9be172d59601c6) Thanks [@burhanharoon](https://github.com/burhanharoon)! - Add `useAIForm` hook — flagship integration that wires `useAIFormFill` into a React Hook Form instance. AI-streamed values flow through `setValue` with `{ shouldDirty: true, shouldTouch: true }`, focused and user-edited fields are protected from overwrite, and `form.trigger` runs once after the stream completes. Also exposes an enhanced `register` that adds a `data-ai-status` attribute and focus tracking.

## 0.1.1

### Patch Changes

- [`f492f06`](https://github.com/burhanharoon/react-ai-form/commit/f492f064cebf589c471240aef40708d0fa953c5f) Thanks [@burhanharoon](https://github.com/burhanharoon)! - docs: update package READMEs with full API documentation and usage examples

- Updated dependencies [[`f492f06`](https://github.com/burhanharoon/react-ai-form/commit/f492f064cebf589c471240aef40708d0fa953c5f)]:
  - @react-ai-form/react@0.1.1

## 0.1.0

### Patch Changes

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

- Updated dependencies [[`1c47d75`](https://github.com/burhanharoon/react-ai-form/commit/1c47d75f2ecc459db560dc13674bda21b9b809fe)]:
  - @react-ai-form/react@0.1.0
