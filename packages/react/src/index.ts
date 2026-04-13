export { CORE_VERSION } from "@react-ai-form/core";

export const REACT_VERSION = "0.0.1";

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
export type { AIConfidenceBadgeProps } from "./components/ai-confidence-badge";
// ── AIConfidenceBadge ─────────────────────────────────────────────
export { AIConfidenceBadge } from "./components/ai-confidence-badge";
export type { AIFieldSuggestionProps } from "./components/ai-field-suggestion";

// ── AIFieldSuggestion ─────────────────────────────────────────────
export { AIFieldSuggestion } from "./components/ai-field-suggestion";
export type { AIFormFillerButtonProps } from "./components/ai-form-filler";
// ── AIFormFillerButton ────────────────────────────────────────────
export { AIFormFillerButton } from "./components/ai-form-filler";
export type {
  AIFormContextValue,
  AIFormProviderProps,
  ResolvedConfig,
} from "./components/ai-form-provider";
// ── AIFormProvider ─────────────────────────────────────────────────
export {
  AIFormContext,
  AIFormProvider,
  DEFAULT_AI_FORM_CONFIG,
  useAIFormContext,
  useResolvedConfig,
} from "./components/ai-form-provider";
export type {
  UseAIFormFillOptions,
  UseAIFormFillReturn,
} from "./hooks/use-ai-form-fill";
// ── useAIFormFill ─────────────────────────────────────────────────
export { useAIFormFill } from "./hooks/use-ai-form-fill";
export type {
  UseAISuggestionOptions,
  UseAISuggestionReturn,
} from "./hooks/use-ai-suggestion";
// ── useAISuggestion ───────────────────────────────────────────────
export { useAISuggestion } from "./hooks/use-ai-suggestion";
// ── Accessibility utilities ───────────────────────────────────────
export {
  AI_FORM_ARIA_LABELS,
  useAriaLiveAnnounce,
  useFocusTrap,
  useReducedMotion,
} from "./utils/a11y";
