export { REACT_VERSION } from "@react-ai-form/react";

export const RHF_ADAPTER_VERSION = "0.0.1";

export type {
  AIFormFieldProps,
  AIFormFieldRenderProps,
  AITextFieldProps,
} from "./ai-form-field";
export { AIFormField, AITextField } from "./ai-form-field";
export type {
  AIFormStatusProviderProps,
  GetFieldStatus,
} from "./ai-form-status-context";
export { AIFormStatusProvider, useAIFormStatusLookup } from "./ai-form-status-context";
export type {
  AIFieldStatus,
  AIRegisterReturn,
  UseAIFormOptions,
  UseAIFormReturn,
} from "./use-ai-form";
export { useAIForm } from "./use-ai-form";
