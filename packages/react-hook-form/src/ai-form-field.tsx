import { AIConfidenceBadge, AIFieldSuggestion, useAISuggestion } from "@react-ai-form/react";
import type { ReactElement, ReactNode } from "react";
import { useCallback } from "react";
import type {
  ControllerFieldState,
  FieldPath,
  FieldValues,
  PathValue,
  UseFormRegisterReturn,
  UseFormReturn,
} from "react-hook-form";
import type { ZodType } from "zod";
import { useAIFormStatusLookup } from "./ai-form-status-context";
import type { AIFieldStatus } from "./use-ai-form";

// ── Render-prop API ───────────────────────────────────────────────

/** Props passed to the {@link AIFormField} `render` callback. */
export interface AIFormFieldRenderProps<TName extends string = string> {
  /** RHF register result for the wrapped field. */
  field: UseFormRegisterReturn<TName>;
  /** RHF field state (error, isDirty, isTouched, invalid). */
  fieldState: ControllerFieldState;
  /** AI suggestion text for the field, or `null`. */
  suggestion: string | null;
  /** Whether a suggestion is being fetched. */
  isLoadingSuggestion: boolean;
  /** Apply the current suggestion to the form value. */
  acceptSuggestion: () => void;
  /** Discard the current suggestion. */
  dismissSuggestion: () => void;
  /** AI status of this field (`'empty' | 'ai-filled' | 'user-modified'`). */
  aiStatus: AIFieldStatus;
}

export interface AIFormFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> {
  /** RHF form instance. */
  form: UseFormReturn<TFieldValues>;
  /** Field name (type-safe RHF path). */
  name: TName;
  /** Optional Zod schema for the field, used to enrich suggestion prompts. */
  schema?: ZodType;
  /** Enable AI ghost-text suggestions for this field. Defaults to `false`. */
  aiSuggestion?: boolean;
  /** Render prop receiving everything needed to render the field. */
  render: (props: AIFormFieldRenderProps<TName>) => ReactElement;
}

// ── Component ─────────────────────────────────────────────────────

/**
 * Render-prop component that wires a single React Hook Form field to
 * `useAISuggestion` and exposes its AI status, suggestion text, and accept
 * handler. Layout is yours to control.
 *
 * @example
 * ```tsx
 * <AIFormField
 *   form={form}
 *   name="company"
 *   aiSuggestion
 *   render={({ field, suggestion, acceptSuggestion, aiStatus }) => (
 *     <div>
 *       <AIFieldSuggestion {...field} suggestion={suggestion} onAccept={acceptSuggestion} />
 *       <AIConfidenceBadge status={aiStatus} />
 *     </div>
 *   )}
 * />
 * ```
 */
export function AIFormField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  form,
  name,
  schema,
  aiSuggestion = false,
  render,
}: AIFormFieldProps<TFieldValues, TName>): ReactElement {
  const field = form.register(name);
  const fieldState = form.getFieldState(name, form.formState);
  const currentValue = form.watch(name);

  const suggestionResult = useAISuggestion({
    fieldName: name,
    value: typeof currentValue === "string" ? currentValue : "",
    enabled: aiSuggestion,
    ...(schema !== undefined ? { schema } : {}),
  });

  const acceptSuggestion = useCallback(() => {
    if (!suggestionResult.suggestion) return;
    const fullValue = suggestionResult.accept();
    form.setValue(name, fullValue as PathValue<TFieldValues, TName>, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false,
    });
  }, [form, name, suggestionResult]);

  const aiStatus = useResolvedAIStatus(name, fieldState.isDirty);

  return render({
    field,
    fieldState,
    suggestion: aiSuggestion ? suggestionResult.suggestion : null,
    isLoadingSuggestion: aiSuggestion ? suggestionResult.isLoading : false,
    acceptSuggestion,
    dismissSuggestion: suggestionResult.dismiss,
    aiStatus,
  });
}

// ── AITextField ────────────────────────────────────────────────────

export interface AITextFieldProps<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
> extends Omit<AIFormFieldProps<TFieldValues, TName>, "render"> {
  /** Visible label rendered above the input. */
  label?: ReactNode;
  /** Input placeholder. */
  placeholder?: string;
  /** Native input type. Defaults to `'text'`. */
  type?: "text" | "email" | "url" | "tel";
  /** Show the AI confidence badge when the field has been AI-filled. Defaults to `true`. */
  aiBadge?: boolean;
  /** Class applied to the wrapper element. */
  className?: string;
}

/**
 * Pre-composed convenience component: a labelled input that renders an
 * {@link AIFieldSuggestion} (with ghost-text) plus an {@link AIConfidenceBadge}
 * and an inline error message. Use {@link AIFormField} when you need to
 * control the layout yourself.
 */
export function AITextField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
  form,
  name,
  schema,
  aiSuggestion = true,
  aiBadge = true,
  label,
  placeholder,
  type = "text",
  className,
}: AITextFieldProps<TFieldValues, TName>): ReactElement {
  return (
    <AIFormField<TFieldValues, TName>
      form={form}
      name={name}
      aiSuggestion={aiSuggestion}
      {...(schema !== undefined ? { schema } : {})}
      render={({
        field,
        fieldState,
        suggestion,
        isLoadingSuggestion,
        acceptSuggestion,
        dismissSuggestion,
        aiStatus,
      }) => (
        <div className={className}>
          {label !== undefined ? <label htmlFor={field.name}>{label}</label> : null}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AIFieldSuggestion
              {...field}
              id={field.name}
              type={type}
              {...(placeholder !== undefined ? { placeholder } : {})}
              suggestion={suggestion}
              isLoading={isLoadingSuggestion}
              onAccept={acceptSuggestion}
              onDismiss={dismissSuggestion}
            />
            {aiBadge ? <AIConfidenceBadge status={aiStatus} /> : null}
          </div>
          {fieldState.error?.message ? (
            <span role="alert" style={{ color: "#dc2626", fontSize: "0.875rem" }}>
              {fieldState.error.message}
            </span>
          ) : null}
        </div>
      )}
    />
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function useResolvedAIStatus(name: string, isDirty: boolean): AIFieldStatus {
  const lookup = useAIFormStatusLookup();
  if (lookup) {
    return lookup(name);
  }
  return isDirty ? "user-modified" : "empty";
}
