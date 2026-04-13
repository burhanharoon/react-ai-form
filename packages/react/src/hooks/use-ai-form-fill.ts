import type { AIFieldUpdate, AIFillResult, AIFormConfig, AIFormError } from "@react-ai-form/core";
import {
  diffPartialObjects,
  extractFieldMeta,
  filterSchemaByPrivacy,
  schemaToSystemPrompt,
} from "@react-ai-form/core";
import type { LanguageModelV1 } from "ai";
import { streamObject } from "ai";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { ZodObject, ZodRawShape } from "zod";
import { useResolvedConfig } from "../components/ai-form-provider";

// ── Types ──────────────────────────────────────────────────────────

/** Status of an individual field in the AI form fill lifecycle. */
type FieldStatus = "empty" | "ai-filled" | "user-modified";

/**
 * Options for the {@link useAIFormFill} hook.
 */
export interface UseAIFormFillOptions<T extends ZodObject<ZodRawShape>> {
  /** Zod schema defining the form shape. Used for both AI structured output and validation. */
  schema: T;

  /** Override the provider-level language model for this hook instance. */
  model?: LanguageModelV1;

  /** Custom API endpoint for server-side streaming. */
  apiEndpoint?: string;

  /** AI form configuration with privacy and field settings. */
  config?: AIFormConfig;

  /** Callback invoked for each field as it streams in from the AI. */
  onFieldUpdate?: (update: AIFieldUpdate) => void;

  /** Callback invoked when the fill operation completes successfully. */
  onComplete?: (result: AIFillResult) => void;

  /** Callback invoked when the fill operation encounters an error. */
  onError?: (error: AIFormError) => void;
}

/**
 * Return value of the {@link useAIFormFill} hook.
 */
export interface UseAIFormFillReturn<T extends ZodObject<ZodRawShape>> {
  /** Trigger an AI-powered fill of the entire form using a text context or prompt. */
  fillForm: (context: string) => Promise<AIFillResult>;

  /** Fill form fields from known data without making an AI call. */
  fillFromData: (data: Partial<T["_output"]>) => void;

  /** Whether a fill operation is currently in progress. */
  isFillingForm: boolean;

  /** Live progress of the current fill operation. */
  progress: { filled: number; total: number };

  /** Set of field paths that were filled by AI. */
  filledFields: Set<string>;

  /** The last error encountered during a fill, or `null`. */
  error: AIFormError | null;

  /** Abort the current in-progress fill operation. */
  abort: () => void;

  /** Reset all AI fill state (clears filled fields, errors, progress). */
  reset: () => void;

  /** Mark a field as user-modified so AI updates will skip it. */
  markUserModified: (fieldPath: string) => void;

  /** Returns the current status of a field by its dot-notation path. */
  getFieldStatus: (path: string) => FieldStatus;
}

// ── Reducer ────────────────────────────────────────────────────────

interface AIFormFillState {
  isFillingForm: boolean;
  progress: { filled: number; total: number };
  filledFields: Set<string>;
  userModifiedFields: Set<string>;
  error: AIFormError | null;
}

type AIFormFillAction =
  | { type: "START_FILL"; total: number }
  | { type: "FIELD_UPDATE"; fieldPath: string }
  | { type: "USER_MODIFY"; fieldPath: string }
  | { type: "COMPLETE" }
  | { type: "ERROR"; error: AIFormError }
  | { type: "ABORT" }
  | { type: "RESET" };

function createInitialState(): AIFormFillState {
  return {
    isFillingForm: false,
    progress: { filled: 0, total: 0 },
    filledFields: new Set<string>(),
    userModifiedFields: new Set<string>(),
    error: null,
  };
}

function formFillReducer(state: AIFormFillState, action: AIFormFillAction): AIFormFillState {
  switch (action.type) {
    case "START_FILL":
      return {
        ...state,
        isFillingForm: true,
        progress: { filled: 0, total: action.total },
        filledFields: new Set<string>(),
        userModifiedFields: state.userModifiedFields,
        error: null,
      };

    case "FIELD_UPDATE": {
      const newFilledFields = new Set(state.filledFields);
      newFilledFields.add(action.fieldPath);
      return {
        ...state,
        filledFields: newFilledFields,
        progress: {
          filled: newFilledFields.size,
          total: state.progress.total,
        },
      };
    }

    case "USER_MODIFY": {
      const newUserModified = new Set(state.userModifiedFields);
      newUserModified.add(action.fieldPath);
      return {
        ...state,
        userModifiedFields: newUserModified,
      };
    }

    case "COMPLETE":
      return {
        ...state,
        isFillingForm: false,
      };

    case "ERROR":
      return {
        ...state,
        isFillingForm: false,
        error: action.error,
      };

    case "ABORT":
      return {
        ...state,
        isFillingForm: false,
      };

    case "RESET":
      return createInitialState();

    default:
      return state;
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function createAIFormError(
  message: string,
  code: AIFormError["code"],
  retryable: boolean,
): AIFormError {
  const error = new Error(message) as AIFormError;
  error.code = code;
  error.retryable = retryable;
  return error;
}

function getLeafFieldPaths(obj: Record<string, unknown>, prefix: string): string[] {
  const paths: string[] = [];
  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      paths.push(...getLeafFieldPaths(value as Record<string, unknown>, path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

// ── Hook ───────────────────────────────────────────────────────────

/**
 * Flagship hook that fills an entire form with AI-generated values from
 * a text context or prompt. Streams structured form data matching a Zod
 * schema using the Vercel AI SDK's `streamObject`.
 *
 * @example
 * ```tsx
 * const { fillForm, isFillingForm, progress } = useAIFormFill({
 *   schema: contactFormSchema,
 *   model: openai("gpt-4o"),
 *   onFieldUpdate: (update) => setValue(update.fieldPath, update.value),
 * });
 *
 * // Trigger a fill from user-provided context
 * await fillForm("John Doe, john@example.com, works at Acme Corp");
 * ```
 */
export function useAIFormFill<T extends ZodObject<ZodRawShape>>(
  options: UseAIFormFillOptions<T>,
): UseAIFormFillReturn<T> {
  const {
    schema,
    model: hookModel,
    apiEndpoint: hookApiEndpoint,
    config: hookConfig,
    onFieldUpdate,
    onComplete,
    onError,
  } = options;

  const resolved = useResolvedConfig({
    ...(hookModel !== undefined ? { model: hookModel } : {}),
    ...(hookApiEndpoint !== undefined ? { apiEndpoint: hookApiEndpoint } : {}),
    ...(hookConfig !== undefined ? hookConfig : {}),
  });

  const [state, dispatch] = useReducer(formFillReducer, undefined, createInitialState);

  const abortControllerRef = useRef<AbortController | null>(null);
  const onFieldUpdateRef = useRef(onFieldUpdate);
  onFieldUpdateRef.current = onFieldUpdate;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  // Abort on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Compute field metadata once per schema change
  const allFieldMeta = useMemo(() => extractFieldMeta(schema), [schema]);

  // Count only leaf fields (not object-type fields) for total
  const leafFieldPaths = useMemo(
    () => allFieldMeta.filter((meta) => meta.type !== "object").map((meta) => meta.path),
    [allFieldMeta],
  );

  const fillForm = useCallback(
    async (context: string): Promise<AIFillResult> => {
      const startTime = Date.now();

      // Abort any previous fill
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Apply privacy filter
      const config = resolved.config;
      const filteredSchema = filterSchemaByPrivacy(schema, config);

      // Compute skipped fields
      const filteredMeta = extractFieldMeta(filteredSchema);
      const filteredPaths = new Set(
        filteredMeta.filter((meta) => meta.type !== "object").map((meta) => meta.path),
      );
      const skippedFields = leafFieldPaths.filter((path) => !filteredPaths.has(path));

      const totalFields = filteredPaths.size;
      dispatch({ type: "START_FILL", total: totalFields });

      // Generate system prompt
      const systemPrompt = schemaToSystemPrompt(filteredSchema);

      let previousPartial: Record<string, unknown> = {};
      const filledFieldsAccumulator: string[] = [];

      try {
        const result = streamObject({
          model: resolved.model,
          schema: filteredSchema,
          system: systemPrompt,
          prompt: context,
          abortSignal: controller.signal,
        });

        for await (const partial of result.partialObjectStream) {
          if (controller.signal.aborted) {
            break;
          }

          const incoming = partial as Record<string, unknown>;
          const updates = diffPartialObjects(previousPartial, incoming);

          for (const update of updates) {
            // Skip user-modified fields
            if (state.userModifiedFields.has(update.fieldPath)) {
              continue;
            }

            dispatch({ type: "FIELD_UPDATE", fieldPath: update.fieldPath });

            if (!filledFieldsAccumulator.includes(update.fieldPath)) {
              filledFieldsAccumulator.push(update.fieldPath);
            }

            onFieldUpdateRef.current?.(update);
          }

          previousPartial = incoming;
        }

        if (controller.signal.aborted) {
          dispatch({ type: "ABORT" });
          const duration = Date.now() - startTime;
          return {
            success: false,
            filledFields: filledFieldsAccumulator,
            skippedFields,
            errors: [],
            duration,
          };
        }

        // Get token usage if available
        let tokensUsed: number | undefined;
        try {
          const usage = await result.usage;
          if (usage?.totalTokens !== undefined) {
            tokensUsed = usage.totalTokens;
          }
        } catch {
          // Token usage is optional — ignore if unavailable
        }

        dispatch({ type: "COMPLETE" });

        const duration = Date.now() - startTime;
        const fillResult: AIFillResult = {
          success: true,
          filledFields: filledFieldsAccumulator,
          skippedFields,
          errors: [],
          duration,
          ...(tokensUsed !== undefined ? { tokensUsed } : {}),
        };

        onCompleteRef.current?.(fillResult);

        return fillResult;
      } catch (err: unknown) {
        if (err instanceof Error && (err.name === "AbortError" || controller.signal.aborted)) {
          dispatch({ type: "ABORT" });
          const duration = Date.now() - startTime;
          return {
            success: false,
            filledFields: filledFieldsAccumulator,
            skippedFields,
            errors: [],
            duration,
          };
        }

        const formError = createAIFormError(
          err instanceof Error ? err.message : String(err),
          "stream_failed",
          true,
        );

        dispatch({ type: "ERROR", error: formError });
        onErrorRef.current?.(formError);

        const duration = Date.now() - startTime;
        return {
          success: false,
          filledFields: filledFieldsAccumulator,
          skippedFields,
          errors: [],
          duration,
        };
      }
    },
    [resolved.model, resolved.config, schema, leafFieldPaths, state.userModifiedFields],
  );

  const fillFromData = useCallback(
    (data: Partial<T["_output"]>) => {
      const dataRecord = data as Record<string, unknown>;
      const paths = getLeafFieldPaths(dataRecord, "");
      dispatch({ type: "START_FILL", total: paths.length });

      for (const fieldPath of paths) {
        dispatch({ type: "FIELD_UPDATE", fieldPath });

        const value = getNestedValue(dataRecord, fieldPath);
        const update: AIFieldUpdate = {
          fieldPath,
          value,
          previousValue: null,
          isComplete: true,
          timestamp: Date.now(),
        };

        onFieldUpdateRef.current?.(update);
      }

      dispatch({ type: "COMPLETE" });
    },
    [
      /* onFieldUpdateRef is stable via ref */
    ],
  );

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    if (state.isFillingForm) {
      dispatch({ type: "ABORT" });
    }
  }, [state.isFillingForm]);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    dispatch({ type: "RESET" });
  }, []);

  const markUserModified = useCallback((fieldPath: string) => {
    dispatch({ type: "USER_MODIFY", fieldPath });
  }, []);

  const getFieldStatus = useCallback(
    (path: string): FieldStatus => {
      if (state.userModifiedFields.has(path)) {
        return "user-modified";
      }
      if (state.filledFields.has(path)) {
        return "ai-filled";
      }
      return "empty";
    },
    [state.userModifiedFields, state.filledFields],
  );

  return {
    fillForm,
    fillFromData,
    isFillingForm: state.isFillingForm,
    progress: state.progress,
    filledFields: state.filledFields,
    error: state.error,
    abort,
    reset,
    markUserModified,
    getFieldStatus,
  };
}

// ── Private utilities ──────────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
