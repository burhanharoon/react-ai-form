import type { AIFillResult, AIFormConfig, AIFormError } from "@react-ai-form/core";
import { act, renderHook } from "@testing-library/react";
import type { LanguageModelV1 } from "ai";
import { streamObject } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { UseAIFormFillOptions } from "./use-ai-form-fill";
import { useAIFormFill } from "./use-ai-form-fill";

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock("ai", () => ({
  streamObject: vi.fn(),
}));

const mockedStreamObject = vi.mocked(streamObject);

// ── Helpers ────────────────────────────────────────────────────────

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

/**
 * Creates an async iterable that yields partial object chunks sequentially.
 */
async function* mockPartialStream<T>(chunks: T[]): AsyncIterable<T> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

/**
 * Creates a mock return value for streamObject, using the provided chunks
 * as the partialObjectStream and the final chunk as the resolved object.
 */
function mockStreamObjectReturn(
  chunks: Record<string, unknown>[],
  opts?: {
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  },
): ReturnType<typeof streamObject> {
  const finalChunk = chunks.length > 0 ? chunks[chunks.length - 1] : {};
  return {
    partialObjectStream: mockPartialStream(chunks),
    object: Promise.resolve(finalChunk),
    usage: Promise.resolve(
      opts?.usage ?? {
        promptTokens: 50,
        completionTokens: 100,
        totalTokens: 150,
      },
    ),
  } as unknown as ReturnType<typeof streamObject>;
}

function extractFieldPaths(mockFn: ReturnType<typeof vi.fn>): string[] {
  return mockFn.mock.calls.map((call: unknown[]) => (call[0] as { fieldPath: string }).fieldPath);
}

const testSchema = z.object({
  firstName: z.string().describe("First name"),
  lastName: z.string().describe("Last name"),
  email: z.string().email().describe("Email address"),
});

function renderFormFillHook(overrides: Partial<UseAIFormFillOptions<typeof testSchema>> = {}) {
  const model = overrides.model ?? createMockModel();
  const defaultOpts: UseAIFormFillOptions<typeof testSchema> = {
    schema: testSchema,
    model,
    ...overrides,
  };

  return renderHook((props: UseAIFormFillOptions<typeof testSchema>) => useAIFormFill(props), {
    initialProps: defaultOpts,
  });
}

// ── Tests ──────────────────────────────────────────────────────────

describe("useAIFormFill", () => {
  beforeEach(() => {
    mockedStreamObject.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns correct initial state", () => {
    const { result } = renderFormFillHook();

    expect(result.current.isFillingForm).toBe(false);
    expect(result.current.progress).toEqual({ filled: 0, total: 0 });
    expect(result.current.filledFields.size).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it("fills form with streamed AI response", async () => {
    const onFieldUpdate = vi.fn();
    const onComplete = vi.fn();

    mockedStreamObject.mockReturnValueOnce(
      mockStreamObjectReturn([
        { firstName: "John" },
        { firstName: "John", lastName: "Doe" },
        {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
      ]),
    );

    const { result } = renderFormFillHook({
      onFieldUpdate,
      onComplete,
    });

    let fillResult: AIFillResult | undefined;
    await act(async () => {
      fillResult = await result.current.fillForm("John Doe, john@example.com");
    });

    expect(fillResult?.success).toBe(true);
    expect(fillResult?.filledFields).toContain("firstName");
    expect(fillResult?.filledFields).toContain("lastName");
    expect(fillResult?.filledFields).toContain("email");
    expect(fillResult?.skippedFields).toEqual([]);
    expect(fillResult?.duration).toBeGreaterThanOrEqual(0);
    expect(fillResult?.tokensUsed).toBe(150);

    expect(result.current.isFillingForm).toBe(false);
    expect(result.current.filledFields.has("firstName")).toBe(true);
    expect(result.current.filledFields.has("lastName")).toBe(true);
    expect(result.current.filledFields.has("email")).toBe(true);

    // onFieldUpdate called for each field change
    expect(onFieldUpdate).toHaveBeenCalled();
    const fieldPaths = extractFieldPaths(onFieldUpdate);
    expect(fieldPaths).toContain("firstName");
    expect(fieldPaths).toContain("lastName");
    expect(fieldPaths).toContain("email");

    // onComplete called with the result
    expect(onComplete).toHaveBeenCalledTimes(1);
    const completeArg = onComplete.mock.calls[0] as unknown[];
    expect((completeArg[0] as AIFillResult).success).toBe(true);
  });

  it("tracks progress as fields arrive", async () => {
    // Use a deferred stream so we can observe intermediate states
    let resolveChunk1: (() => void) | undefined;
    let resolveChunk2: (() => void) | undefined;

    async function* controlledStream() {
      yield { firstName: "John" };
      await new Promise<void>((r) => {
        resolveChunk1 = r;
      });
      yield { firstName: "John", lastName: "Doe" };
      await new Promise<void>((r) => {
        resolveChunk2 = r;
      });
      yield {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };
    }

    mockedStreamObject.mockReturnValueOnce({
      partialObjectStream: controlledStream(),
      object: Promise.resolve({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      }),
      usage: Promise.resolve({
        promptTokens: 50,
        completionTokens: 100,
        totalTokens: 150,
      }),
    } as unknown as ReturnType<typeof streamObject>);

    const { result } = renderFormFillHook();

    // Start the fill but don't await it yet
    let fillPromise: Promise<AIFillResult> | undefined;
    act(() => {
      fillPromise = result.current.fillForm("John Doe");
    });

    // Let microtasks run for the first yield
    await act(async () => {
      await Promise.resolve();
    });

    // After first chunk: firstName is filled
    expect(result.current.progress.filled).toBeGreaterThanOrEqual(1);
    expect(result.current.isFillingForm).toBe(true);

    // Release second chunk
    await act(async () => {
      resolveChunk1?.();
      await Promise.resolve();
    });

    expect(result.current.progress.filled).toBeGreaterThanOrEqual(2);

    // Release third chunk
    await act(async () => {
      resolveChunk2?.();
      await Promise.resolve();
    });

    // Wait for completion
    await act(async () => {
      await fillPromise;
    });

    expect(result.current.progress).toEqual({ filled: 3, total: 3 });
    expect(result.current.isFillingForm).toBe(false);
  });

  it("aborts mid-stream and keeps partial fields", async () => {
    let resolveAfterFirst: (() => void) | undefined;

    async function* slowStream() {
      yield { firstName: "John" };
      await new Promise<void>((r) => {
        resolveAfterFirst = r;
      });
      yield {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      };
    }

    mockedStreamObject.mockReturnValueOnce({
      partialObjectStream: slowStream(),
      object: Promise.resolve({ firstName: "John" }),
      usage: Promise.resolve({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      }),
    } as unknown as ReturnType<typeof streamObject>);

    const { result } = renderFormFillHook();

    let fillPromise: Promise<AIFillResult> | undefined;
    act(() => {
      fillPromise = result.current.fillForm("John Doe");
    });

    // Let first chunk process
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.filledFields.has("firstName")).toBe(true);
    expect(result.current.isFillingForm).toBe(true);

    // Abort
    act(() => {
      result.current.abort();
    });

    // Resolve the pending promise so the stream can exit
    resolveAfterFirst?.();

    const fillResult = await act(async () => {
      return fillPromise;
    });

    expect(result.current.isFillingForm).toBe(false);
    // Partial fields remain
    expect(result.current.filledFields.has("firstName")).toBe(true);
    expect(fillResult?.success).toBe(false);
    expect(fillResult?.filledFields).toContain("firstName");
  });

  it("applies privacy filter and skips high-sensitivity fields", async () => {
    const schemaWithSensitive = z.object({
      name: z.string().describe("Full name"),
      ssn: z.string().describe("Social security number"),
    });

    const config: AIFormConfig = {
      fields: {
        ssn: { aiEnabled: false, sensitivity: "high" },
      },
    };

    mockedStreamObject.mockReturnValueOnce(mockStreamObjectReturn([{ name: "John Doe" }]));

    const hookResult = renderHook(
      (props: UseAIFormFillOptions<typeof schemaWithSensitive>) => useAIFormFill(props),
      {
        initialProps: {
          schema: schemaWithSensitive,
          model: createMockModel(),
          config,
        },
      },
    );

    let fillResult: AIFillResult | undefined;
    await act(async () => {
      fillResult = await hookResult.result.current.fillForm("John Doe 123-45-6789");
    });

    // The ssn field should be skipped
    expect(fillResult?.skippedFields).toContain("ssn");
    expect(fillResult?.filledFields).toContain("name");

    // Verify streamObject was called with a schema that doesn't include ssn
    const callArgs = mockedStreamObject.mock.calls[0] as unknown[] | undefined;
    expect(callArgs).toBeDefined();
    if (callArgs) {
      const firstArg = callArgs[0] as Record<string, unknown>;
      const calledSchema = firstArg["schema"] as z.ZodObject<z.ZodRawShape>;
      const shape = calledSchema.shape;
      expect(shape["name"]).toBeDefined();
      expect(shape["ssn"]).toBeUndefined();
    }
  });

  it("handles API errors and sets error state", async () => {
    const onError = vi.fn();

    const rejectedObject = Promise.reject(new Error("API rate limit exceeded"));
    // Prevent unhandled rejection warning — the hook catches this via the stream
    rejectedObject.catch(() => {});

    async function* failingStream() {
      yield {};
      throw new Error("API rate limit exceeded");
    }

    mockedStreamObject.mockReturnValueOnce({
      partialObjectStream: failingStream(),
      object: rejectedObject,
      usage: Promise.resolve({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      }),
    } as unknown as ReturnType<typeof streamObject>);

    const { result } = renderFormFillHook({ onError });

    let fillResult: AIFillResult | undefined;
    await act(async () => {
      fillResult = await result.current.fillForm("some context");
    });

    expect(fillResult?.success).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error?.code).toBe("stream_failed");
    expect(result.current.error?.retryable).toBe(true);
    expect(result.current.error?.message).toBe("API rate limit exceeded");
    expect(result.current.isFillingForm).toBe(false);

    // onError callback invoked
    expect(onError).toHaveBeenCalledTimes(1);
    const errorCall = onError.mock.calls[0] as unknown[];
    const calledError = errorCall[0] as AIFormError;
    expect(calledError.code).toBe("stream_failed");
  });

  it("latest fillForm wins when called multiple times concurrently", async () => {
    let resolveFirst: (() => void) | undefined;

    async function* firstStream() {
      await new Promise<void>((r) => {
        resolveFirst = r;
      });
      yield { firstName: "First" };
    }

    async function* secondStream() {
      yield { firstName: "Second" };
      yield { firstName: "Second", lastName: "Call" };
      yield {
        firstName: "Second",
        lastName: "Call",
        email: "second@test.com",
      };
    }

    mockedStreamObject
      .mockReturnValueOnce({
        partialObjectStream: firstStream(),
        object: Promise.resolve({ firstName: "First" }),
        usage: Promise.resolve({
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        }),
      } as unknown as ReturnType<typeof streamObject>)
      .mockReturnValueOnce({
        partialObjectStream: secondStream(),
        object: Promise.resolve({
          firstName: "Second",
          lastName: "Call",
          email: "second@test.com",
        }),
        usage: Promise.resolve({
          promptTokens: 50,
          completionTokens: 100,
          totalTokens: 150,
        }),
      } as unknown as ReturnType<typeof streamObject>);

    const { result } = renderFormFillHook();

    // Start first fill
    let firstPromise: Promise<AIFillResult> | undefined;
    act(() => {
      firstPromise = result.current.fillForm("first context");
    });

    // Immediately start second fill (should abort first)
    let secondResult: AIFillResult | undefined;
    await act(async () => {
      secondResult = await result.current.fillForm("second context");
    });

    // Release the first stream's promise so it can clean up
    resolveFirst?.();
    await act(async () => {
      await firstPromise;
    });

    // Second call should have succeeded
    expect(secondResult?.success).toBe(true);
    expect(secondResult?.filledFields).toContain("firstName");
    expect(secondResult?.filledFields).toContain("lastName");
    expect(secondResult?.filledFields).toContain("email");

    // streamObject should have been called twice
    expect(mockedStreamObject).toHaveBeenCalledTimes(2);
  });

  it("reset() clears all state", async () => {
    mockedStreamObject.mockReturnValueOnce(
      mockStreamObjectReturn([
        { firstName: "John" },
        { firstName: "John", lastName: "Doe" },
        {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
      ]),
    );

    const { result } = renderFormFillHook();

    await act(async () => {
      await result.current.fillForm("John Doe");
    });

    expect(result.current.filledFields.size).toBeGreaterThan(0);
    expect(result.current.progress.filled).toBeGreaterThan(0);

    act(() => {
      result.current.reset();
    });

    expect(result.current.isFillingForm).toBe(false);
    expect(result.current.progress).toEqual({
      filled: 0,
      total: 0,
    });
    expect(result.current.filledFields.size).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it("getFieldStatus returns correct values for empty, ai-filled, and user-modified", async () => {
    mockedStreamObject.mockReturnValueOnce(
      mockStreamObjectReturn([
        {
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
      ]),
    );

    const { result } = renderFormFillHook();

    // Before fill — all empty
    expect(result.current.getFieldStatus("firstName")).toBe("empty");
    expect(result.current.getFieldStatus("lastName")).toBe("empty");

    await act(async () => {
      await result.current.fillForm("John Doe");
    });

    // After fill — ai-filled
    expect(result.current.getFieldStatus("firstName")).toBe("ai-filled");
    expect(result.current.getFieldStatus("lastName")).toBe("ai-filled");
    expect(result.current.getFieldStatus("email")).toBe("ai-filled");

    // Mark a field as user-modified
    act(() => {
      result.current.markUserModified("firstName");
    });

    expect(result.current.getFieldStatus("firstName")).toBe("user-modified");
    expect(result.current.getFieldStatus("lastName")).toBe("ai-filled");

    // Unknown field is empty
    expect(result.current.getFieldStatus("nonExistent")).toBe("empty");
  });

  it("fillFromData sets fields without an AI call", () => {
    const onFieldUpdate = vi.fn();

    const { result } = renderFormFillHook({ onFieldUpdate });

    act(() => {
      result.current.fillFromData({
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
      });
    });

    // No AI call made
    expect(mockedStreamObject).not.toHaveBeenCalled();

    // Fields are tracked
    expect(result.current.filledFields.has("firstName")).toBe(true);
    expect(result.current.filledFields.has("lastName")).toBe(true);
    expect(result.current.filledFields.has("email")).toBe(true);

    // onFieldUpdate called for each field
    expect(onFieldUpdate).toHaveBeenCalledTimes(3);
    const fieldPaths = extractFieldPaths(onFieldUpdate);
    expect(fieldPaths).toContain("firstName");
    expect(fieldPaths).toContain("lastName");
    expect(fieldPaths).toContain("email");

    // Progress reflects the data fill
    expect(result.current.progress).toEqual({
      filled: 3,
      total: 3,
    });

    // Fill is complete (not in progress)
    expect(result.current.isFillingForm).toBe(false);

    // Status is ai-filled (since data was programmatically set)
    expect(result.current.getFieldStatus("firstName")).toBe("ai-filled");
  });

  it("user-modified fields are skipped during streaming", async () => {
    const onFieldUpdate = vi.fn();

    mockedStreamObject.mockReturnValueOnce(
      mockStreamObjectReturn([
        { firstName: "AI-John" },
        { firstName: "AI-John", lastName: "AI-Doe" },
        {
          firstName: "AI-John",
          lastName: "AI-Doe",
          email: "ai@example.com",
        },
      ]),
    );

    const { result } = renderFormFillHook({ onFieldUpdate });

    // Mark firstName as user-modified before fill
    act(() => {
      result.current.markUserModified("firstName");
    });

    await act(async () => {
      await result.current.fillForm("some context");
    });

    // firstName should NOT have been updated by AI
    const updatedPaths = extractFieldPaths(onFieldUpdate);
    expect(updatedPaths).not.toContain("firstName");
    expect(updatedPaths).toContain("lastName");
    expect(updatedPaths).toContain("email");
  });

  it("cleanup on unmount aborts in-progress fill", async () => {
    let streamResolve: (() => void) | undefined;

    async function* slowStream() {
      yield { firstName: "John" };
      await new Promise<void>((r) => {
        streamResolve = r;
      });
      yield { firstName: "John", lastName: "Doe" };
    }

    mockedStreamObject.mockReturnValueOnce({
      partialObjectStream: slowStream(),
      object: Promise.resolve({ firstName: "John" }),
      usage: Promise.resolve({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      }),
    } as unknown as ReturnType<typeof streamObject>);

    const { result, unmount } = renderFormFillHook();

    act(() => {
      void result.current.fillForm("John Doe");
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Unmount while fill is in progress
    unmount();

    // Resolve the stream so it can clean up
    streamResolve?.();

    // No error should be thrown — cleanup happens gracefully
  });
});
