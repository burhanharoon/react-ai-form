# @react-ai-form/react

## 0.2.6

### Patch Changes

- [#30](https://github.com/burhanharoon/react-ai-form/pull/30) [`7c33d15`](https://github.com/burhanharoon/react-ai-form/commit/7c33d1511e53a5a41beda91fae691547a5f9c582) Thanks [@burhanharoon](https://github.com/burhanharoon)! - Ship a `LICENSE` file (MIT) inside every published tarball and set the `author` and `publishConfig.provenance: true` fields so each release now carries a GitHub-signed provenance attestation. Broaden the `keywords` on each package for better npm discoverability — no runtime behaviour changes.

- Updated dependencies [[`7c33d15`](https://github.com/burhanharoon/react-ai-form/commit/7c33d1511e53a5a41beda91fae691547a5f9c582)]:
  - @react-ai-form/core@0.2.6

## 0.2.5

### Patch Changes

- [#28](https://github.com/burhanharoon/react-ai-form/pull/28) [`599e556`](https://github.com/burhanharoon/react-ai-form/commit/599e5567868f3176008e8ed4b318dbf435088df0) Thanks [@burhanharoon](https://github.com/burhanharoon)! - Ship a `"use client"` directive on every build output of the React and React Hook Form adapter packages so Next.js App Router apps can import from Server Components without a consumer-side pragma. A dedicated CI job now runs the full test suite against React 18 on every PR to lock the `^18.0.0 || ^19.0.0` peer range. `@react-ai-form/core` has no React or DOM dependencies — a new module-graph contract test proves every public export can be invoked without a client-only global, so it's safe to import from React Server Components.

- Updated dependencies [[`599e556`](https://github.com/burhanharoon/react-ai-form/commit/599e5567868f3176008e8ed4b318dbf435088df0)]:
  - @react-ai-form/core@0.2.5

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

- Updated dependencies [[`54400d8`](https://github.com/burhanharoon/react-ai-form/commit/54400d89b504023acb40a5b40138c1d23d96d6b4)]:
  - @react-ai-form/core@0.2.4

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
