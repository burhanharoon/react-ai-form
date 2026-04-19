import { act, renderHook } from "@testing-library/react";
import type { LanguageModelV1 } from "ai";
import { streamObject } from "ai";
import { type UseFormReturn, useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { type UseAIFormOptions, useAIForm } from "./use-ai-form";

vi.mock("ai", () => ({
  streamObject: vi.fn(),
}));

const mockedStreamObject = vi.mocked(streamObject);

function createMockModel(): LanguageModelV1 {
  return {
    specificationVersion: "v1",
    provider: "test",
    modelId: "mock",
    defaultObjectGenerationMode: "json",
    doGenerate: vi.fn(),
    doStream: vi.fn(),
  } as unknown as LanguageModelV1;
}

async function* mockPartialStream<T>(chunks: T[]): AsyncIterable<T> {
  for (const chunk of chunks) {
    yield chunk;
  }
}

function mockStreamObjectReturn(
  chunks: Record<string, unknown>[],
): ReturnType<typeof streamObject> {
  const finalChunk = chunks.length > 0 ? chunks[chunks.length - 1] : {};
  return {
    partialObjectStream: mockPartialStream(chunks),
    object: Promise.resolve(finalChunk),
    usage: Promise.resolve({ promptTokens: 10, completionTokens: 20, totalTokens: 30 }),
  } as unknown as ReturnType<typeof streamObject>;
}

const flatSchema = z.object({
  firstName: z.string().describe("First name"),
  lastName: z.string().describe("Last name"),
  email: z.string().email().describe("Email"),
});

type FlatValues = z.infer<typeof flatSchema>;

const nestedSchema = z.object({
  personal: z.object({
    firstName: z.string().describe("First name"),
    lastName: z.string().describe("Last name"),
  }),
  address: z.object({
    city: z.string().describe("City"),
    zip: z.string().describe("Postal code"),
  }),
});

type NestedValues = z.infer<typeof nestedSchema>;

interface FlatHarness {
  form: UseFormReturn<FlatValues>;
  ai: ReturnType<typeof useAIForm<typeof flatSchema>>;
}

function renderFlat(overrides: Partial<UseAIFormOptions<typeof flatSchema>> = {}): {
  result: { current: FlatHarness };
  unmount: () => void;
} {
  const model = overrides.model ?? createMockModel();
  return renderHook<FlatHarness, undefined>(() => {
    const form = useForm<FlatValues>({
      defaultValues: { firstName: "", lastName: "", email: "" },
    });
    const ai = useAIForm(form, {
      schema: flatSchema,
      model,
      ...overrides,
    });
    return { form, ai };
  });
}

interface NestedHarness {
  form: UseFormReturn<NestedValues>;
  ai: ReturnType<typeof useAIForm<typeof nestedSchema>>;
}

function renderNested(): { result: { current: NestedHarness }; unmount: () => void } {
  const model = createMockModel();
  return renderHook<NestedHarness, undefined>(() => {
    const form = useForm<NestedValues>({
      defaultValues: {
        personal: { firstName: "", lastName: "" },
        address: { city: "", zip: "" },
      },
    });
    const ai = useAIForm(form, { schema: nestedSchema, model });
    return { form, ai };
  });
}

describe("useAIForm", () => {
  beforeEach(() => {
    mockedStreamObject.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("populates RHF values via form.setValue when AI streams in", async () => {
    mockedStreamObject.mockReturnValue(
      mockStreamObjectReturn([
        { firstName: "Ada" },
        { firstName: "Ada", lastName: "Lovelace" },
        { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
      ]),
    );

    const { result } = renderFlat();

    await act(async () => {
      await result.current.ai.fillForm("Ada Lovelace");
    });

    const values = result.current.form.getValues();
    expect(values.firstName).toBe("Ada");
    expect(values.lastName).toBe("Lovelace");
    expect(values.email).toBe("ada@example.com");
  });

  it("marks AI-filled fields as dirty in RHF", async () => {
    mockedStreamObject.mockReturnValue(
      mockStreamObjectReturn([
        { firstName: "Grace", lastName: "Hopper", email: "grace@example.com" },
      ]),
    );

    const { result } = renderFlat();

    await act(async () => {
      await result.current.ai.fillForm("Grace Hopper");
    });

    const dirty = result.current.form.formState.dirtyFields;
    expect(dirty.firstName).toBe(true);
    expect(dirty.lastName).toBe(true);
    expect(dirty.email).toBe(true);
  });

  it("exposes data-ai-status on the enhanced register", async () => {
    mockedStreamObject.mockReturnValue(mockStreamObjectReturn([{ firstName: "Linus" }]));

    const { result } = renderFlat();

    expect(result.current.ai.register("firstName")["data-ai-status"]).toBe("empty");

    await act(async () => {
      await result.current.ai.fillForm("Linus");
    });

    expect(result.current.ai.register("firstName")["data-ai-status"]).toBe("ai-filled");
  });

  it("does not overwrite the actively focused field during streaming", async () => {
    mockedStreamObject.mockReturnValue(
      mockStreamObjectReturn([{ firstName: "Ada", lastName: "Lovelace" }]),
    );

    const { result } = renderFlat();

    // Pre-set a value on firstName and simulate that user is focused on it.
    act(() => {
      result.current.form.setValue("firstName", "Burhan");
    });
    const reg = result.current.ai.register("firstName");
    act(() => {
      reg.onFocus?.({} as unknown as React.FocusEvent<HTMLInputElement>);
    });

    await act(async () => {
      await result.current.ai.fillForm("Ada Lovelace");
    });

    expect(result.current.form.getValues().firstName).toBe("Burhan");
    expect(result.current.form.getValues().lastName).toBe("Lovelace");
  });

  it("does not overwrite user-modified fields", async () => {
    mockedStreamObject.mockReturnValue(
      mockStreamObjectReturn([{ firstName: "Ada", lastName: "Lovelace" }]),
    );

    const { result } = renderFlat();

    act(() => {
      result.current.ai.markUserModified("firstName");
      result.current.form.setValue("firstName", "Burhan", {
        shouldDirty: true,
        shouldTouch: true,
      });
    });

    await act(async () => {
      await result.current.ai.fillForm("Ada Lovelace");
    });

    expect(result.current.form.getValues().firstName).toBe("Burhan");
    expect(result.current.form.getValues().lastName).toBe("Lovelace");
  });

  it("calls form.trigger after the stream completes", async () => {
    mockedStreamObject.mockReturnValue(
      mockStreamObjectReturn([{ firstName: "Ada", lastName: "Lovelace", email: "not-an-email" }]),
    );

    const { result } = renderFlat({
      schema: flatSchema,
    });
    const triggerSpy = vi.spyOn(result.current.form, "trigger");

    await act(async () => {
      await result.current.ai.fillForm("Ada");
    });

    expect(triggerSpy).toHaveBeenCalled();
    const calledWithPaths = triggerSpy.mock.calls[0]?.[0];
    expect(calledWithPaths).toEqual(expect.arrayContaining(["firstName", "lastName", "email"]));
  });

  it("supports nested field paths", async () => {
    mockedStreamObject.mockReturnValue(
      mockStreamObjectReturn([
        {
          personal: { firstName: "Ada", lastName: "Lovelace" },
          address: { city: "London", zip: "WC1" },
        },
      ]),
    );

    const { result } = renderNested();

    await act(async () => {
      await result.current.ai.fillForm("Ada in London");
    });

    const values = result.current.form.getValues();
    expect(values.personal.firstName).toBe("Ada");
    expect(values.personal.lastName).toBe("Lovelace");
    expect(values.address.city).toBe("London");
    expect(values.address.zip).toBe("WC1");
  });

  it("reset() clears AI state but keeps RHF values intact", async () => {
    mockedStreamObject.mockReturnValue(
      mockStreamObjectReturn([{ firstName: "Ada", lastName: "Lovelace" }]),
    );

    const { result } = renderFlat();

    await act(async () => {
      await result.current.ai.fillForm("Ada");
    });

    expect(result.current.ai.filledFields.size).toBeGreaterThan(0);
    expect(result.current.form.getValues().firstName).toBe("Ada");

    act(() => {
      result.current.ai.reset();
    });

    expect(result.current.ai.filledFields.size).toBe(0);
    expect(result.current.ai.getFieldStatus("firstName")).toBe("empty");
    // Values untouched.
    expect(result.current.form.getValues().firstName).toBe("Ada");
  });

  it("reset({ clearValues: true }) also resets RHF form values", async () => {
    mockedStreamObject.mockReturnValue(mockStreamObjectReturn([{ firstName: "Ada" }]));

    const { result } = renderFlat();

    await act(async () => {
      await result.current.ai.fillForm("Ada");
    });

    expect(result.current.form.getValues().firstName).toBe("Ada");

    act(() => {
      result.current.ai.reset({ clearValues: true });
    });

    expect(result.current.form.getValues().firstName).toBe("");
  });

  it("propagates errors via state.error and onError without breaking the form", async () => {
    mockedStreamObject.mockImplementation(() => {
      throw new Error("boom");
    });
    const onError = vi.fn();

    const { result } = renderFlat({ onError });

    await act(async () => {
      await result.current.ai.fillForm("Ada");
    });

    expect(result.current.ai.error).not.toBeNull();
    expect(result.current.ai.error?.code).toBe("stream_failed");
    expect(onError).toHaveBeenCalledTimes(1);
    // Form still usable.
    act(() => {
      result.current.form.setValue("firstName", "Recovered");
    });
    expect(result.current.form.getValues().firstName).toBe("Recovered");
  });
});
