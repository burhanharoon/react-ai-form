# @react-ai-form/react

## 0.2.3

### Patch Changes

- [#23](https://github.com/burhanharoon/react-ai-form/pull/23) [`2d00791`](https://github.com/burhanharoon/react-ai-form/commit/2d0079121c71c253201593a171aa311dd6329611) Thanks [@burhanharoon](https://github.com/burhanharoon)! - Rewrite the root README as a production-quality landing page (badge row, one-screen Quick Start, API reference, recipes, comparison table, privacy section). Add CONTRIBUTING.md. Docs-only; no code changes.

- Updated dependencies [[`2d00791`](https://github.com/burhanharoon/react-ai-form/commit/2d0079121c71c253201593a171aa311dd6329611)]:
  - @react-ai-form/core@0.2.3

## 0.2.2

### Patch Changes

- [#21](https://github.com/burhanharoon/react-ai-form/pull/21) [`6f7edbb`](https://github.com/burhanharoon/react-ai-form/commit/6f7edbb9599db776a24a407ccfe760503631ef6f) Thanks [@burhanharoon](https://github.com/burhanharoon)! - Add live demo URL (https://react-ai-form.vercel.app) to each package README so it shows up on npmjs.com.

- Updated dependencies [[`6f7edbb`](https://github.com/burhanharoon/react-ai-form/commit/6f7edbb9599db776a24a407ccfe760503631ef6f)]:
  - @react-ai-form/core@0.2.2

## 0.2.1

### Patch Changes

- [`efc93a4`](https://github.com/burhanharoon/react-ai-form/commit/efc93a419c25157a04d478b27f0f3304fe347f35) Thanks [@burhanharoon](https://github.com/burhanharoon)! - Document the `useAIFormContext()` and `useResolvedConfig()` hooks in the README. Both have always been public exports from `src/index.ts` but the README only covered the higher-level `useAISuggestion` / `useAIFormFill` / `AIFormProvider` surface. The new "Advanced: reading provider state" subsection explains when to reach for each and what they return — useful for anyone building custom hooks on top of `AIFormProvider`.

## 0.1.1

### Patch Changes

- [`f492f06`](https://github.com/burhanharoon/react-ai-form/commit/f492f064cebf589c471240aef40708d0fa953c5f) Thanks [@burhanharoon](https://github.com/burhanharoon)! - docs: update package READMEs with full API documentation and usage examples

- Updated dependencies [[`f492f06`](https://github.com/burhanharoon/react-ai-form/commit/f492f064cebf589c471240aef40708d0fa953c5f)]:
  - @react-ai-form/core@0.1.1

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

### Patch Changes

- Updated dependencies [[`1c47d75`](https://github.com/burhanharoon/react-ai-form/commit/1c47d75f2ecc459db560dc13674bda21b9b809fe)]:
  - @react-ai-form/core@0.1.0
