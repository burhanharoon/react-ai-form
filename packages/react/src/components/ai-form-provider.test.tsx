import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import type { LanguageModelV1 } from "ai";
import {
  AIFormProvider,
  DEFAULT_AI_FORM_CONFIG,
  useAIFormContext,
  useResolvedConfig,
} from "./ai-form-provider";

// ── Mock model ─────────────────────────────────────────────────────

function createMockModel(id = "mock-model"): LanguageModelV1 {
  return {
    specificationVersion: "v1",
    provider: "test",
    modelId: id,
    defaultObjectGenerationMode: "json",
    doGenerate: vi.fn(),
    doStream: vi.fn(),
  } as unknown as LanguageModelV1;
}

// ── AIFormProvider ─────────────────────────────────────────────────

describe("AIFormProvider", () => {
  it("renders children", () => {
    const model = createMockModel();
    const { result } = renderHook(() => useAIFormContext(), {
      wrapper: ({ children }) =>
        createElement(AIFormProvider, { model, children }),
    });

    expect(result.current).toBeDefined();
  });

  it("provides model via context", () => {
    const model = createMockModel("gpt-4o");
    const { result } = renderHook(() => useAIFormContext(), {
      wrapper: ({ children }) =>
        createElement(AIFormProvider, { model, children }),
    });

    expect(result.current.model).toBe(model);
  });

  it("provides apiEndpoint via context", () => {
    const model = createMockModel();
    const { result } = renderHook(() => useAIFormContext(), {
      wrapper: ({ children }) =>
        createElement(
          AIFormProvider,
          { model, apiEndpoint: "/api/ai-form", children },
        ),
    });

    expect(result.current.apiEndpoint).toBe("/api/ai-form");
  });

  it("merges user config with defaults", () => {
    const model = createMockModel();
    const { result } = renderHook(() => useAIFormContext(), {
      wrapper: ({ children }) =>
        createElement(
          AIFormProvider,
          { model, config: { debounceMs: 200 }, children },
        ),
    });

    expect(result.current.config.debounceMs).toBe(200);
    expect(result.current.config.maxRetries).toBe(
      DEFAULT_AI_FORM_CONFIG.maxRetries,
    );
    expect(result.current.config.cacheEnabled).toBe(
      DEFAULT_AI_FORM_CONFIG.cacheEnabled,
    );
  });

  it("applies default config values when no config provided", () => {
    const model = createMockModel();
    const { result } = renderHook(() => useAIFormContext(), {
      wrapper: ({ children }) =>
        createElement(AIFormProvider, { model, children }),
    });

    expect(result.current.config).toEqual(
      expect.objectContaining(DEFAULT_AI_FORM_CONFIG),
    );
  });

  it("creates and provides a cache instance", () => {
    const model = createMockModel();
    const { result } = renderHook(() => useAIFormContext(), {
      wrapper: ({ children }) =>
        createElement(AIFormProvider, { model, children }),
    });

    const { cache } = result.current;
    expect(cache).toBeDefined();
    expect(typeof cache.get).toBe("function");
    expect(typeof cache.set).toBe("function");
    expect(typeof cache.has).toBe("function");
  });
});

// ── useAIFormContext ───────────────────────────────────────────────

describe("useAIFormContext", () => {
  it("throws a descriptive error outside provider", () => {
    expect(() => {
      renderHook(() => useAIFormContext());
    }).toThrow(
      "useAIFormContext must be used within <AIFormProvider>. " +
        "Wrap your form with <AIFormProvider model={...}>.",
    );
  });

  it("returns context values inside provider", () => {
    const model = createMockModel();
    const { result } = renderHook(() => useAIFormContext(), {
      wrapper: ({ children }) =>
        createElement(AIFormProvider, { model, children }),
    });

    expect(result.current.model).toBe(model);
    expect(result.current.config).toBeDefined();
    expect(result.current.cache).toBeDefined();
  });
});

// ── useResolvedConfig ─────────────────────────────────────────────

describe("useResolvedConfig", () => {
  it("throws when no model is available from props or context", () => {
    expect(() => {
      renderHook(() => useResolvedConfig());
    }).toThrow(
      "No AI model provided. Either pass `model` directly to the hook, " +
        "or wrap your component with <AIFormProvider model={...}>.",
    );
  });

  it("resolves model from hook props without provider", () => {
    const model = createMockModel();
    const { result } = renderHook(() => useResolvedConfig({ model }));

    expect(result.current.model).toBe(model);
  });

  it("resolves model from context when no hook props", () => {
    const model = createMockModel();
    const { result } = renderHook(() => useResolvedConfig(), {
      wrapper: ({ children }) =>
        createElement(AIFormProvider, { model, children }),
    });

    expect(result.current.model).toBe(model);
  });

  it("hook-level model overrides context-level model", () => {
    const contextModel = createMockModel("context-model");
    const hookModel = createMockModel("hook-model");

    const { result } = renderHook(
      () => useResolvedConfig({ model: hookModel }),
      {
        wrapper: ({ children }) =>
          createElement(AIFormProvider, { model: contextModel, children }),
      },
    );

    expect(result.current.model).toBe(hookModel);
  });

  it("hook-level config overrides context-level config", () => {
    const model = createMockModel();

    const { result } = renderHook(
      () => useResolvedConfig({ debounceMs: 100 }),
      {
        wrapper: ({ children }) =>
          createElement(
            AIFormProvider,
            { model, config: { debounceMs: 500 }, children },
          ),
      },
    );

    expect(result.current.config.debounceMs).toBe(100);
  });

  it("hook-level apiEndpoint overrides context-level", () => {
    const model = createMockModel();

    const { result } = renderHook(
      () => useResolvedConfig({ apiEndpoint: "/hook-endpoint" }),
      {
        wrapper: ({ children }) =>
          createElement(
            AIFormProvider,
            { model, apiEndpoint: "/context-endpoint", children },
          ),
      },
    );

    expect(result.current.apiEndpoint).toBe("/hook-endpoint");
  });

  it("uses default config when no context and no hook config", () => {
    const model = createMockModel();
    const { result } = renderHook(() => useResolvedConfig({ model }));

    expect(result.current.config.debounceMs).toBe(
      DEFAULT_AI_FORM_CONFIG.debounceMs,
    );
    expect(result.current.config.maxRetries).toBe(
      DEFAULT_AI_FORM_CONFIG.maxRetries,
    );
    expect(result.current.config.cacheEnabled).toBe(
      DEFAULT_AI_FORM_CONFIG.cacheEnabled,
    );
    expect(result.current.config.cacheTTL).toBe(
      DEFAULT_AI_FORM_CONFIG.cacheTTL,
    );
  });

  it("creates a fallback cache when used without provider", () => {
    const model = createMockModel();
    const { result } = renderHook(() => useResolvedConfig({ model }));

    expect(result.current.cache).toBeDefined();
    expect(typeof result.current.cache.get).toBe("function");
  });

  it("uses provider cache when available", () => {
    const model = createMockModel();

    const { result } = renderHook(
      () => ({
        context: useAIFormContext(),
        resolved: useResolvedConfig(),
      }),
      {
        wrapper: ({ children }) =>
          createElement(AIFormProvider, { model, children }),
      },
    );

    expect(result.current.resolved.cache).toBe(result.current.context.cache);
  });
});
