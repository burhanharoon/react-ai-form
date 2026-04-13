import { act, renderHook } from "@testing-library/react";
import type { LanguageModelV1 } from "ai";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIFormProvider } from "../components/ai-form-provider";
import type { UseAISuggestionOptions } from "./use-ai-suggestion";
import { useAISuggestion } from "./use-ai-suggestion";

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
const { generateText } = vi.mocked(await import("ai"));

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

function mockGenerateTextResult(text: string) {
  generateText.mockResolvedValueOnce({ text } as Awaited<ReturnType<typeof generateText>>);
}

// ── Helpers ────────────────────────────────────────────────────────

function renderSuggestionHook(
  opts: Partial<UseAISuggestionOptions> & { model?: LanguageModelV1 } = {},
) {
  const model = opts.model ?? createMockModel();
  const defaultOpts: UseAISuggestionOptions = {
    fieldName: "company",
    value: "",
    model,
    ...opts,
  };

  return renderHook((props: UseAISuggestionOptions) => useAISuggestion(props), {
    initialProps: defaultOpts,
  });
}

function renderSuggestionHookWithProvider(opts: Partial<UseAISuggestionOptions> = {}) {
  const model = createMockModel();
  const defaultOpts: UseAISuggestionOptions = {
    fieldName: "company",
    value: "",
    ...opts,
  };

  return renderHook((props: UseAISuggestionOptions) => useAISuggestion(props), {
    initialProps: defaultOpts,
    wrapper: ({ children }) => createElement(AIFormProvider, { model, children }),
  });
}

// ── Tests ──────────────────────────────────────────────────────────

describe("useAISuggestion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    generateText.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial state with no suggestion", () => {
    const { result } = renderSuggestionHook({ value: "" });

    expect(result.current.suggestion).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("suggestion appears after debounce delay", async () => {
    mockGenerateTextResult("orporation Inc.");

    const { result, rerender } = renderSuggestionHook({ value: "" });

    // Type enough characters
    rerender({
      fieldName: "company",
      value: "Acme C",
      model: createMockModel(),
    });

    // Before debounce fires — no loading yet
    expect(result.current.isLoading).toBe(false);

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    // Should have called generateText
    expect(generateText).toHaveBeenCalledTimes(1);

    // Wait for the promise to resolve
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.suggestion).toBe("orporation Inc.");
    expect(result.current.isLoading).toBe(false);
  });

  it("previous request aborted when value changes rapidly", async () => {
    mockGenerateTextResult("first result");
    mockGenerateTextResult("second result");

    const model = createMockModel();
    const { rerender } = renderSuggestionHook({
      value: "",
      model,
    });

    // First change
    rerender({ fieldName: "company", value: "Acme", model });

    // Advance partway
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Second change before debounce fires
    rerender({ fieldName: "company", value: "Acme Co", model });

    // Advance past debounce
    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runAllTimersAsync();
    });

    // Only the second call should have been made (first timer was cleared)
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("suggestion cleared on dismiss()", async () => {
    mockGenerateTextResult("orp");

    const model = createMockModel();
    const { result, rerender } = renderSuggestionHook({
      value: "",
      model,
    });

    rerender({ fieldName: "company", value: "Acme C", model });

    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runAllTimersAsync();
    });

    expect(result.current.suggestion).toBe("orp");

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.suggestion).toBeNull();
  });

  it("accept() returns combined value and clears suggestion", async () => {
    mockGenerateTextResult("orporation");

    const model = createMockModel();
    const { result, rerender } = renderSuggestionHook({
      value: "",
      model,
    });

    rerender({ fieldName: "company", value: "Acme C", model });

    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runAllTimersAsync();
    });

    expect(result.current.suggestion).toBe("orporation");

    let fullValue: string | undefined;
    act(() => {
      fullValue = result.current.accept();
    });

    expect(fullValue).toBe("Acme Corporation");
    expect(result.current.suggestion).toBeNull();
  });

  it("cache hit skips API call", async () => {
    mockGenerateTextResult("orp");
    mockGenerateTextResult("orp again");

    const model = createMockModel();
    const { result, rerender } = renderSuggestionHook({
      value: "",
      model,
    });

    // First request
    rerender({ fieldName: "company", value: "Acme C", model });
    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runAllTimersAsync();
    });
    expect(result.current.suggestion).toBe("orp");
    expect(generateText).toHaveBeenCalledTimes(1);

    // Change away and come back
    rerender({ fieldName: "company", value: "different", model });
    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runAllTimersAsync();
    });

    rerender({ fieldName: "company", value: "Acme C", model });
    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runAllTimersAsync();
    });

    // Should have used cache, not called again for the same input
    // (2 calls total: first "Acme C" + "different", but not a third for "Acme C" again)
    expect(generateText).toHaveBeenCalledTimes(2);
    expect(result.current.suggestion).toBe("orp");
  });

  it("enabled: false prevents any AI calls", async () => {
    const model = createMockModel();
    const { rerender } = renderSuggestionHook({
      value: "",
      model,
      enabled: false,
    });

    rerender({
      fieldName: "company",
      value: "Acme Corp",
      model,
      enabled: false,
    });

    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runAllTimersAsync();
    });

    expect(generateText).not.toHaveBeenCalled();
  });

  it("minChars threshold respected", async () => {
    const model = createMockModel();
    const { rerender } = renderSuggestionHook({
      value: "",
      model,
      minChars: 5,
    });

    // Below threshold
    rerender({ fieldName: "company", value: "Acm", model, minChars: 5 });
    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runAllTimersAsync();
    });
    expect(generateText).not.toHaveBeenCalled();

    // At threshold
    mockGenerateTextResult("e Corp");
    rerender({ fieldName: "company", value: "Acme ", model, minChars: 5 });
    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runAllTimersAsync();
    });
    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("error state set on API failure (not on abort)", async () => {
    generateText.mockRejectedValueOnce(new Error("API rate limit"));

    const model = createMockModel();
    const { result, rerender } = renderSuggestionHook({
      value: "",
      model,
    });

    rerender({ fieldName: "company", value: "Acme Corp", model });

    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runAllTimersAsync();
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("API rate limit");
    expect(result.current.suggestion).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("triggerMode: manual only fires on refresh()", async () => {
    mockGenerateTextResult("orp");

    const model = createMockModel();
    const { result, rerender } = renderSuggestionHook({
      value: "Acme C",
      model,
      triggerMode: "manual",
    });

    // Typing should not trigger
    rerender({
      fieldName: "company",
      value: "Acme Co",
      model,
      triggerMode: "manual",
    });
    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runAllTimersAsync();
    });
    expect(generateText).not.toHaveBeenCalled();

    // Manual refresh should trigger
    await act(async () => {
      result.current.refresh();
      await vi.runAllTimersAsync();
    });

    expect(generateText).toHaveBeenCalledTimes(1);
  });

  it("works with provider context (no model prop)", async () => {
    mockGenerateTextResult("suggestion from provider");

    const { result, rerender } = renderSuggestionHookWithProvider({
      value: "",
    });

    rerender({ fieldName: "company", value: "Test input" });

    await act(async () => {
      vi.advanceTimersByTime(400);
      await vi.runAllTimersAsync();
    });

    expect(result.current.suggestion).toBe("suggestion from provider");
  });

  it("cleanup on unmount aborts in-flight request", async () => {
    mockGenerateTextResult("never arrives");

    const model = createMockModel();
    const { rerender, unmount } = renderSuggestionHook({
      value: "",
      model,
    });

    rerender({ fieldName: "company", value: "Acme Corp", model });

    // Start debounce but unmount before it fires
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    unmount();

    // Timer fires after unmount — should be cleaned up
    await act(async () => {
      vi.advanceTimersByTime(300);
      await vi.runAllTimersAsync();
    });

    // No API call made since timer was cleared
    expect(generateText).not.toHaveBeenCalled();
  });
});
