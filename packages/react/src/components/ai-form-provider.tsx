import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type { LanguageModelV1 } from "ai";
import type { AICache, AIFormConfig, AIProvider } from "@react-ai-form/core";
import { createAICache } from "@react-ai-form/core";

// ── Default configuration ──────────────────────────────────────────

/** Default form-level AI configuration values. */
export const DEFAULT_AI_FORM_CONFIG: AIFormConfig = {
  debounceMs: 400,
  maxRetries: 2,
  cacheEnabled: true,
  cacheTTL: 300_000,
};

// ── Context types ──────────────────────────────────────────────────

/**
 * The value held by AIFormContext, providing shared AI configuration
 * to all descendant hooks and components.
 */
export interface AIFormContextValue {
  /** The language model instance from the Vercel AI SDK. */
  model: LanguageModelV1;

  /** Custom API endpoint for server-side streaming. */
  apiEndpoint?: string | undefined;

  /** Merged form-level AI configuration. */
  config: AIFormConfig;

  /** Shared LRU cache for AI responses. */
  cache: AICache<unknown>;
}

/**
 * Props for the {@link AIFormProvider} component.
 */
export interface AIFormProviderProps {
  /** The language model instance from any Vercel AI SDK provider (required). */
  model: LanguageModelV1;

  /** Custom API endpoint for server-side streaming (e.g. '/api/ai-form'). */
  apiEndpoint?: string | undefined;

  /** Form-level AI configuration (privacy settings, debounce, etc.). */
  config?: AIFormConfig;

  /** Options for the shared response cache. */
  cacheOptions?: { maxSize?: number; ttl?: number };

  /** React children to render inside the provider. */
  children: ReactNode;
}

// ── Context ────────────────────────────────────────────────────────

/**
 * React context for sharing AI form configuration. Undefined by default —
 * hooks throw a descriptive error when used outside of {@link AIFormProvider}.
 */
export const AIFormContext = createContext<AIFormContextValue | undefined>(
  undefined,
);

// ── Provider component ─────────────────────────────────────────────

/**
 * Provides shared AI configuration (model, endpoint, config, cache)
 * to all descendant hooks and components via React context.
 *
 * @example
 * ```tsx
 * import { openai } from "@ai-sdk/openai";
 * import { AIFormProvider } from "@react-ai-form/react";
 *
 * function App() {
 *   return (
 *     <AIFormProvider model={openai("gpt-4o")}>
 *       <MyForm />
 *     </AIFormProvider>
 *   );
 * }
 * ```
 */
export function AIFormProvider({
  model,
  apiEndpoint,
  config,
  cacheOptions,
  children,
}: AIFormProviderProps) {
  const cache = useMemo(
    () => createAICache<unknown>(cacheOptions),
    [cacheOptions?.maxSize, cacheOptions?.ttl],
  );

  const mergedConfig = useMemo(
    () => ({ ...DEFAULT_AI_FORM_CONFIG, ...config }),
    [config],
  );

  const value = useMemo<AIFormContextValue>(
    () => ({ model, apiEndpoint, config: mergedConfig, cache }),
    [model, apiEndpoint, mergedConfig, cache],
  );

  return <AIFormContext.Provider value={value}>{children}</AIFormContext.Provider>;
}

// ── Hooks ──────────────────────────────────────────────────────────

/**
 * Returns the AIFormContext value. Throws a descriptive error if called
 * outside of an {@link AIFormProvider}.
 */
export function useAIFormContext(): AIFormContextValue {
  const context = useContext(AIFormContext);
  if (context === undefined) {
    throw new Error(
      "useAIFormContext must be used within <AIFormProvider>. " +
        "Wrap your form with <AIFormProvider model={...}>.",
    );
  }
  return context;
}

/**
 * Resolved configuration produced by {@link useResolvedConfig}.
 * Contains the model, endpoint, merged config, and cache — sourced
 * from hook-level props first, then provider context, then defaults.
 */
export interface ResolvedConfig {
  /** The resolved language model. */
  model: LanguageModelV1;

  /** The resolved API endpoint. */
  apiEndpoint?: string | undefined;

  /** The merged AI form configuration. */
  config: AIFormConfig;

  /** The resolved cache instance. */
  cache: AICache<unknown>;
}

/**
 * Merges AI configuration from three layers (hook props > context > defaults)
 * so that individual hooks can work both with and without an {@link AIFormProvider}.
 *
 * @param hookProps - Optional overrides passed directly to a hook.
 * @returns The fully resolved configuration.
 * @throws If no `model` is available from either `hookProps` or context.
 */
export function useResolvedConfig(
  hookProps?: Partial<AIProvider & AIFormConfig> & {
    cacheOptions?: { maxSize?: number; ttl?: number };
  },
): ResolvedConfig {
  const context = useContext(AIFormContext);

  const model = hookProps?.model ?? context?.model;
  if (!model) {
    throw new Error(
      "No AI model provided. Either pass `model` directly to the hook, " +
        "or wrap your component with <AIFormProvider model={...}>.",
    );
  }

  const apiEndpoint = hookProps?.apiEndpoint ?? context?.apiEndpoint;

  const config = useMemo(() => {
    const base = context?.config ?? DEFAULT_AI_FORM_CONFIG;
    const {
      model: _m,
      apiEndpoint: _a,
      cacheOptions: _c,
      ...hookConfig
    } = hookProps ?? {};
    return { ...DEFAULT_AI_FORM_CONFIG, ...base, ...hookConfig };
  }, [context?.config, hookProps]);

  const fallbackCache = useMemo(
    () => createAICache<unknown>(hookProps?.cacheOptions),
    [hookProps?.cacheOptions?.maxSize, hookProps?.cacheOptions?.ttl],
  );

  const cache = context?.cache ?? fallbackCache;

  return { model, apiEndpoint, config, cache };
}
