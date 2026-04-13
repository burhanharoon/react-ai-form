import type { LanguageModelV1 } from "ai";
import { generateText } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ZodType } from "zod";
import { useResolvedConfig } from "../components/ai-form-provider";

// ── Types ──────────────────────────────────────────────────────────

/**
 * Options for the {@link useAISuggestion} hook.
 */
export interface UseAISuggestionOptions {
  /** The name of the form field to suggest for. */
  fieldName: string;

  /** Current value of the field. */
  value: string;

  /** Other form field values to provide context to the AI. */
  context?: Record<string, unknown>;

  /** Zod schema for the field, used to provide type hints to the AI. */
  schema?: ZodType;

  /** Override the provider-level model for this field. */
  model?: LanguageModelV1;

  /** Disable suggestions without unmounting the hook. Defaults to `true`. */
  enabled?: boolean;

  /** Debounce delay in milliseconds before triggering a suggestion. Defaults to `400`. */
  debounceMs?: number;

  /** Minimum characters before suggestions are generated. Defaults to `3`. */
  minChars?: number;

  /** When to fetch suggestions. Defaults to `'typing'`. */
  triggerMode?: "typing" | "blur" | "manual";
}

/**
 * Return value of the {@link useAISuggestion} hook.
 */
export interface UseAISuggestionReturn {
  /** The AI-generated suggestion text, or `null` if none available. */
  suggestion: string | null;

  /** Whether a suggestion is currently being fetched. */
  isLoading: boolean;

  /** The last error encountered, or `null`. */
  error: Error | null;

  /** Accept the current suggestion. Returns the full value (current + suggestion). */
  accept: () => string;

  /** Dismiss the current suggestion. */
  dismiss: () => void;

  /** Manually trigger a new suggestion fetch. */
  refresh: () => void;

  /**
   * Blur handler for `triggerMode: 'blur'`.
   * Attach to the input's `onBlur` to trigger suggestion fetching on blur.
   */
  handleBlur: () => void;
}

// ── Hook ───────────────────────────────────────────────────────────

/**
 * Provides AI-powered inline suggestions for an individual form field.
 * Watches the field value, debounces changes, and calls the AI to generate
 * a completion suggestion.
 *
 * @example
 * ```tsx
 * const { suggestion, accept, dismiss } = useAISuggestion({
 *   fieldName: "company",
 *   value: companyValue,
 *   model: openai("gpt-4o"),
 * });
 * ```
 */
export function useAISuggestion(options: UseAISuggestionOptions): UseAISuggestionReturn {
  const {
    fieldName,
    value,
    context,
    schema,
    model: hookModel,
    enabled = true,
    debounceMs: hookDebounceMs,
    minChars = 3,
    triggerMode = "typing",
  } = options;

  const resolved = useResolvedConfig({
    ...(hookModel !== undefined ? { model: hookModel } : {}),
    ...(hookDebounceMs !== undefined ? { debounceMs: hookDebounceMs } : {}),
  });
  const debounceMs = resolved.config.debounceMs ?? 400;

  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contextRef = useRef(context);
  contextRef.current = context;

  // Build a cache key from field name, value, and context
  const buildCacheKey = useCallback(
    (val: string) => `suggestion:${fieldName}:${val}:${JSON.stringify(contextRef.current ?? {})}`,
    [fieldName],
  );

  // Core fetch logic — extracted so both the effect and refresh() can call it
  const fetchSuggestion = useCallback(
    async (currentValue: string) => {
      // Check cache first
      const cacheKey = buildCacheKey(currentValue);
      const cached = resolved.cache.get(cacheKey) as string | undefined;
      if (cached !== undefined) {
        setSuggestion(cached);
        setIsLoading(false);
        return;
      }

      // Abort any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      try {
        const schemaHint = schema
          ? ` The field expects a value matching this type: ${schema.description ?? "unknown"}.`
          : "";

        const contextStr = contextRef.current
          ? ` Other form fields: ${JSON.stringify(contextRef.current)}.`
          : "";

        const result = await generateText({
          model: resolved.model,
          prompt:
            `Complete the following form field. Field: "${fieldName}". ` +
            `Current value: "${currentValue}".${contextStr}${schemaHint} ` +
            `Provide ONLY the completion text that should come after the current value. Do not repeat the existing value.`,
          abortSignal: controller.signal,
        });

        // Guard against stale responses after abort
        if (!controller.signal.aborted) {
          const text = result.text.trim();
          if (text) {
            setSuggestion(text);
            resolved.cache.set(cacheKey, text);
          } else {
            setSuggestion(null);
          }
          setIsLoading(false);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // Aborted requests are expected — don't set error state, but clear loading
          setIsLoading(false);
          return;
        }
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setSuggestion(null);
          setIsLoading(false);
        }
      }
    },
    [resolved.model, resolved.cache, fieldName, schema, buildCacheKey],
  );

  // Debounced effect for typing mode
  useEffect(() => {
    if (!enabled || triggerMode !== "typing") {
      abortRef.current?.abort();
      setIsLoading(false);
      return () => {};
    }
    if (value.length < minChars) {
      abortRef.current?.abort();
      setSuggestion(null);
      setIsLoading(false);
      return () => {};
    }

    // Clear pending timer
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    // Abort any in-flight request
    abortRef.current?.abort();

    timerRef.current = setTimeout(() => {
      void fetchSuggestion(value);
    }, debounceMs);

    return () => {
      abortRef.current?.abort();
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, enabled, triggerMode, minChars, debounceMs, fetchSuggestion]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const accept = useCallback((): string => {
    const fullValue = suggestion ? value + suggestion : value;
    setSuggestion(null);
    return fullValue;
  }, [value, suggestion]);

  const dismiss = useCallback(() => {
    setSuggestion(null);
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const refresh = useCallback(() => {
    if (!enabled) return;
    if (value.length < minChars) return;
    void fetchSuggestion(value);
  }, [enabled, value, minChars, fetchSuggestion]);

  const handleBlur = useCallback(() => {
    if (!enabled || triggerMode !== "blur") return;
    if (value.length < minChars) return;
    void fetchSuggestion(value);
  }, [enabled, triggerMode, value, minChars, fetchSuggestion]);

  return { suggestion, isLoading, error, accept, dismiss, refresh, handleBlur };
}
