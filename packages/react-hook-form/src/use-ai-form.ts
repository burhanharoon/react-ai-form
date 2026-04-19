import type {
  AIFieldUpdate,
  AIFillResult,
  AIFormConfig,
  AIFormError,
  UseAIFormFillReturn,
} from "@react-ai-form/react";
import { useAIFormFill } from "@react-ai-form/react";
import type { LanguageModelV1 } from "ai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type {
  FieldPath,
  PathValue,
  RegisterOptions,
  UseFormRegisterReturn,
  UseFormReturn,
} from "react-hook-form";
import type { ZodObject, ZodRawShape, z } from "zod";

/** Form elements RHF can register — used for broader focus/blur typing. */
type RegisterableElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** Status of an individual field in the AI form fill lifecycle. */
export type AIFieldStatus = "empty" | "ai-filled" | "user-modified";

/**
 * Options for the {@link useAIForm} hook — connects {@link useAIFormFill} to
 * an existing React Hook Form instance.
 */
export interface UseAIFormOptions<T extends ZodObject<ZodRawShape>> {
  /** Zod schema describing the form. Same instance you used to build the resolver. */
  schema: T;

  /** Override the provider-level language model for this hook instance. */
  model?: LanguageModelV1;

  /** Custom server-side streaming endpoint. */
  apiEndpoint?: string;

  /** AI form configuration (privacy, per-field overrides, debounce, cache). */
  config?: AIFormConfig;

  /** Invoked once after `fillForm` finishes streaming and post-fill validation runs. */
  onFillComplete?: (result: AIFillResult) => void;

  /** Invoked when a fill operation errors. */
  onError?: (error: AIFormError) => void;
}

/** Register return enriched with the field's AI status and a focus handler. */
export type AIRegisterReturn<TName extends string> = UseFormRegisterReturn<TName> & {
  onFocus: (event: React.FocusEvent<RegisterableElement>) => void;
  "data-ai-status": AIFieldStatus;
};

/** Return value of {@link useAIForm}. */
export interface UseAIFormReturn<T extends ZodObject<ZodRawShape>>
  extends Omit<UseAIFormFillReturn<T>, "reset"> {
  /**
   * Wraps RHF's `register` with focus tracking, immediate user-edit marking
   * on `onChange`, and a `data-ai-status` attribute derived from the field's
   * current AI status. Accepts the same `options` parameter as RHF's own
   * `register` (e.g. `{ valueAsNumber: true }`).
   */
  register: <TName extends FieldPath<z.infer<T>>>(
    name: TName,
    options?: RegisterOptions<z.infer<T>, TName>,
  ) => AIRegisterReturn<TName>;

  /**
   * Reset the AI fill state (filled fields, user-modified tracking, errors).
   * Pass `{ clearValues: true }` to also call `form.reset()` and wipe form values.
   */
  reset: (options?: { clearValues?: boolean }) => void;
}

/**
 * Connects {@link useAIFormFill} to a React Hook Form instance. AI-generated
 * values flow through `setValue` with `{ shouldDirty: true, shouldTouch: true }`,
 * actively-focused and user-edited fields are protected from overwrite, and
 * validation runs once after the stream completes.
 *
 * @example
 * ```tsx
 * const form = useForm<z.infer<typeof contactSchema>>({
 *   resolver: zodResolver(contactSchema),
 * });
 *
 * const { fillForm, register, isFillingForm, getFieldStatus } = useAIForm(form, {
 *   schema: contactSchema,
 *   model: openai("gpt-4o"),
 * });
 *
 * <input {...register("email")} />
 * <button onClick={() => fillForm("John Doe at Acme Corp")}>Fill with AI</button>
 * ```
 */
export function useAIForm<T extends ZodObject<ZodRawShape>>(
  form: UseFormReturn<z.infer<T>>,
  options: UseAIFormOptions<T>,
): UseAIFormReturn<T> {
  const { schema, model, apiEndpoint, config, onFillComplete, onError } = options;

  // Tracks the field path the user is currently focused on. AI updates skip it.
  const activeFieldRef = useRef<string | null>(null);
  // Pending blur timer so blur+refocus on the same field doesn't unprotect it.
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Field paths the AI is in the middle of writing, so RHF's dirty signal
  // doesn't get misinterpreted as a user edit.
  const aiWritingPathsRef = useRef<Set<string>>(new Set());

  // Stable ref to the form so callbacks below don't churn.
  const formRef = useRef(form);
  formRef.current = form;

  const handleFieldUpdate = useCallback((update: AIFieldUpdate) => {
    const f = formRef.current;
    const fieldPath = update.fieldPath;

    if (activeFieldRef.current === fieldPath) {
      return;
    }

    aiWritingPathsRef.current.add(fieldPath);
    f.setValue(
      fieldPath as FieldPath<z.infer<T>>,
      update.value as PathValue<z.infer<T>, FieldPath<z.infer<T>>>,
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      },
    );
  }, []);

  const onCompleteRef = useRef(onFillComplete);
  onCompleteRef.current = onFillComplete;

  const handleComplete = useCallback(async (result: AIFillResult) => {
    const f = formRef.current;
    if (result.filledFields.length > 0) {
      // Await so `onFillComplete` consumers can inspect settled
      // `formState.errors` / `formState.isValid` as the JSDoc promises.
      await f.trigger(result.filledFields as FieldPath<z.infer<T>>[]);
    }
    onCompleteRef.current?.(result);
  }, []);

  const fill = useAIFormFill<T>({
    schema,
    ...(model !== undefined ? { model } : {}),
    ...(apiEndpoint !== undefined ? { apiEndpoint } : {}),
    ...(config !== undefined ? { config } : {}),
    onFieldUpdate: handleFieldUpdate,
    onComplete: handleComplete,
    ...(onError !== undefined ? { onError } : {}),
  });

  const { markUserModified, getFieldStatus, reset: resetFill, isFillingForm } = fill;

  // Watch RHF's dirty state to detect user edits during/after a fill, so we
  // can mark them as user-modified and prevent later AI overwrites.
  // We snapshot `dirtyFields` via `form.formState.dirtyFields` — RHF's proxy
  // tracks subscribed keys for re-render efficiency.
  const dirtyFields = form.formState.dirtyFields;
  const previouslyDirtyRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const currentDirty = collectDirtyPaths(dirtyFields as Record<string, unknown>, "");
    const newlyDirty = currentDirty.filter((p) => !previouslyDirtyRef.current.has(p));
    for (const path of newlyDirty) {
      // If we just wrote it via AI, consume the marker — it's not a user edit.
      if (aiWritingPathsRef.current.has(path)) {
        aiWritingPathsRef.current.delete(path);
        continue;
      }
      markUserModified(path);
    }
    previouslyDirtyRef.current = new Set(currentDirty);
  }, [dirtyFields, markUserModified]);

  // Cleanup pending blur timer on unmount.
  useEffect(() => {
    return () => {
      if (blurTimerRef.current !== null) {
        clearTimeout(blurTimerRef.current);
      }
    };
  }, []);

  const register = useCallback(
    <TName extends FieldPath<z.infer<T>>>(
      name: TName,
      registerOptions?: RegisterOptions<z.infer<T>, TName>,
    ): AIRegisterReturn<TName> => {
      const original = form.register(name, registerOptions);
      const status = getFieldStatus(name);

      const wrappedOnFocus = () => {
        if (blurTimerRef.current !== null) {
          clearTimeout(blurTimerRef.current);
          blurTimerRef.current = null;
        }
        activeFieldRef.current = name;
      };

      const wrappedOnBlur: typeof original.onBlur = async (event) => {
        if (blurTimerRef.current !== null) {
          clearTimeout(blurTimerRef.current);
        }
        blurTimerRef.current = setTimeout(() => {
          if (activeFieldRef.current === name) {
            activeFieldRef.current = null;
          }
          blurTimerRef.current = null;
        }, 100);
        return original.onBlur(event);
      };

      // Wrap onChange so user edits mark the field user-modified immediately,
      // even if AI previously wrote it (which leaves `dirtyFields[name] = true`
      // and would otherwise make our dirty-field diff miss the edit).
      const wrappedOnChange: typeof original.onChange = (event) => {
        if (activeFieldRef.current !== name) {
          activeFieldRef.current = name;
        }
        aiWritingPathsRef.current.delete(name);
        markUserModified(name);
        return original.onChange(event);
      };

      return {
        ...original,
        onChange: wrappedOnChange,
        onBlur: wrappedOnBlur,
        onFocus: wrappedOnFocus,
        "data-ai-status": status,
      };
    },
    // form.register is stable across renders for a given form, but we depend
    // on `form` so register reflects the latest form instance.
    [form, getFieldStatus, markUserModified],
  );

  const reset = useCallback(
    (resetOptions?: { clearValues?: boolean }) => {
      activeFieldRef.current = null;
      aiWritingPathsRef.current.clear();
      previouslyDirtyRef.current = new Set();
      resetFill();
      if (resetOptions?.clearValues) {
        formRef.current.reset();
      }
    },
    [resetFill],
  );

  // Return the underlying fill API plus our enhanced register and reset.
  return useMemo<UseAIFormReturn<T>>(
    () => ({
      fillForm: fill.fillForm,
      fillFromData: fill.fillFromData,
      isFillingForm,
      progress: fill.progress,
      filledFields: fill.filledFields,
      error: fill.error,
      abort: fill.abort,
      reset,
      markUserModified,
      getFieldStatus,
      register,
    }),
    [
      fill.fillForm,
      fill.fillFromData,
      fill.progress,
      fill.filledFields,
      fill.error,
      fill.abort,
      isFillingForm,
      reset,
      markUserModified,
      getFieldStatus,
      register,
    ],
  );
}

// ── Internals ──────────────────────────────────────────────────────

function collectDirtyPaths(dirty: Record<string, unknown> | undefined, prefix: string): string[] {
  if (!dirty) return [];
  const paths: string[] = [];
  for (const key of Object.keys(dirty)) {
    const value = dirty[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (value === true) {
      paths.push(path);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item === true) {
          paths.push(`${path}.${index}`);
        } else if (item && typeof item === "object") {
          paths.push(...collectDirtyPaths(item as Record<string, unknown>, `${path}.${index}`));
        }
      });
    } else if (value && typeof value === "object") {
      paths.push(...collectDirtyPaths(value as Record<string, unknown>, path));
    }
  }
  return paths;
}
