---
"@react-ai-form/core": minor
"@react-ai-form/react": minor
"@react-ai-form/react-hook-form": patch
---

feat(react): complete @react-ai-form/react v2

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
