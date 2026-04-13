export { CORE_VERSION } from "@react-ai-form/core";

export const REACT_VERSION = "0.0.1";

// ── AIFormProvider ─────────────────────────────────────────────────
export {
  AIFormContext,
  AIFormProvider,
  useAIFormContext,
  useResolvedConfig,
  DEFAULT_AI_FORM_CONFIG,
} from "./components/ai-form-provider";
export type {
  AIFormContextValue,
  AIFormProviderProps,
  ResolvedConfig,
} from "./components/ai-form-provider";

// ── useAISuggestion ───────────────────────────────────────────────
export { useAISuggestion } from "./hooks/use-ai-suggestion";
export type {
  UseAISuggestionOptions,
  UseAISuggestionReturn,
} from "./hooks/use-ai-suggestion";

// ── AIFieldSuggestion ─────────────────────────────────────────────
export { AIFieldSuggestion } from "./components/ai-field-suggestion";
export type { AIFieldSuggestionProps } from "./components/ai-field-suggestion";

// ── useAIFormFill ─────────────────────────────────────────────────
export { useAIFormFill } from "./hooks/use-ai-form-fill";
export type {
  UseAIFormFillOptions,
  UseAIFormFillReturn,
} from "./hooks/use-ai-form-fill";

// ── AIFormFillerButton ────────────────────────────────────────────
export { AIFormFillerButton } from "./components/ai-form-filler";
export type { AIFormFillerButtonProps } from "./components/ai-form-filler";

// ── AIConfidenceBadge ─────────────────────────────────────────────
export { AIConfidenceBadge } from "./components/ai-confidence-badge";
export type { AIConfidenceBadgeProps } from "./components/ai-confidence-badge";

// ── Accessibility utilities ───────────────────────────────────────
export {
  useAriaLiveAnnounce,
  useReducedMotion,
  useFocusTrap,
  AI_FORM_ARIA_LABELS,
} from "./utils/a11y";

// ── Re-export core types ──────────────────────────────────────────
export type {
  AICache,
  AIFieldConfig,
  AIFieldError,
  AIFieldMeta,
  AIFieldUpdate,
  AIFillResult,
  AIFormConfig,
  AIFormError,
  AIProvider,
  DeepPartial,
  FieldRouter,
} from "@react-ai-form/core";
