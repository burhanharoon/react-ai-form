import "@testing-library/jest-dom/vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { LanguageModelV1 } from "ai";
import { streamObject } from "ai";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { useAIForm } from "../use-ai-form";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return {
    ...actual,
    streamObject: vi.fn(),
  };
});

const mockedStreamObject = vi.mocked(streamObject);

// ── Helpers ────────────────────────────────────────────────────────

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

interface MockStreamOptions {
  /** Delay (ms) between successive partials. Default 0. */
  delayMs?: number;
  /** Throw after yielding `throwAfter` chunks. */
  throwAfter?: number;
  /** Abort signal forwarded to the stream loop. */
  signal?: AbortSignal;
}

function mockStreamObject(
  partials: Record<string, unknown>[],
  opts: MockStreamOptions = {},
): ReturnType<typeof streamObject> {
  async function* stream(): AsyncIterable<Record<string, unknown>> {
    let i = 0;
    for (const p of partials) {
      if (opts.signal?.aborted) return;
      if (opts.delayMs && opts.delayMs > 0) {
        await new Promise<void>((res) => setTimeout(res, opts.delayMs));
      }
      if (opts.throwAfter !== undefined && i >= opts.throwAfter) {
        throw new Error("simulated stream failure");
      }
      i += 1;
      yield p;
    }
  }
  const finalChunk = partials.length > 0 ? partials[partials.length - 1] : {};
  return {
    partialObjectStream: stream(),
    object: Promise.resolve(finalChunk),
    usage: Promise.resolve({ promptTokens: 10, completionTokens: 20, totalTokens: 30 }),
  } as unknown as ReturnType<typeof streamObject>;
}

// ── Schemas ────────────────────────────────────────────────────────

const contactSchema = z.object({
  name: z.string().min(1).describe("Full name"),
  email: z.string().email().describe("Email address"),
  company: z.string().describe("Company name"),
  message: z.string().min(10).describe("Message"),
});

type Contact = z.infer<typeof contactSchema>;

const applicationSchema = z.object({
  personal: z.object({
    firstName: z.string().describe("First name"),
    lastName: z.string().describe("Last name"),
    email: z.string().email().describe("Email"),
    ssn: z.string().describe("Social security number"),
  }),
  job: z.object({
    title: z.string().describe("Current job title"),
    company: z.string().describe("Current company"),
    yearsExperience: z.number().describe("Years of experience"),
  }),
});

type Application = z.infer<typeof applicationSchema>;

// ── Form components ───────────────────────────────────────────────

function ContactForm({
  onApiError,
  onComplete,
}: {
  onApiError?: (msg: string) => void;
  onComplete?: () => void;
}) {
  const form = useForm<Contact>({
    defaultValues: { name: "", email: "", company: "", message: "" },
    resolver: async (values) => {
      const parsed = contactSchema.safeParse(values);
      if (parsed.success) {
        return { values: parsed.data, errors: {} };
      }
      const errors: Record<string, { type: string; message: string }> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!errors[path]) errors[path] = { type: issue.code, message: issue.message };
      }
      return { values: {}, errors };
    },
  });
  const ai = useAIForm(form, {
    schema: contactSchema,
    model: createMockModel(),
    ...(onApiError ? { onError: (e) => onApiError(e.message) } : {}),
    ...(onComplete ? { onFillComplete: () => onComplete() } : {}),
  });
  return (
    <div>
      <input aria-label="name" {...ai.register("name")} />
      <input aria-label="email" {...ai.register("email")} />
      <input aria-label="company" {...ai.register("company")} />
      <input aria-label="message" {...ai.register("message")} />
      <button
        type="button"
        onClick={() => {
          void ai.fillForm("Test context");
        }}
      >
        Fill with AI
      </button>
      <button type="button" onClick={() => ai.abort()}>
        Abort
      </button>
      <span data-testid="progress">
        {ai.progress.filled}/{ai.progress.total}
      </span>
      <span data-testid="filling">{String(ai.isFillingForm)}</span>
      <span data-testid="values">{JSON.stringify(form.getValues())}</span>
      <span data-testid="dirty">{Object.keys(form.formState.dirtyFields).join(",")}</span>
      <span data-testid="error-name">{form.formState.errors.name?.message ?? ""}</span>
      <span data-testid="error-email">{form.formState.errors.email?.message ?? ""}</span>
    </div>
  );
}

function ApplicationForm() {
  const form = useForm<Application>({
    defaultValues: {
      personal: { firstName: "", lastName: "", email: "", ssn: "" },
      job: { title: "", company: "", yearsExperience: 0 },
    },
  });
  const ai = useAIForm(form, {
    schema: applicationSchema,
    model: createMockModel(),
    config: {
      fields: {
        "personal.ssn": { aiEnabled: false, sensitivity: "high" },
      },
    },
  });
  return (
    <div>
      <input aria-label="firstName" {...ai.register("personal.firstName")} />
      <input aria-label="lastName" {...ai.register("personal.lastName")} />
      <input aria-label="email" {...ai.register("personal.email")} />
      <input aria-label="ssn" {...ai.register("personal.ssn")} />
      <input aria-label="title" {...ai.register("job.title")} />
      <input aria-label="company" {...ai.register("job.company")} />
      <button
        type="button"
        onClick={() => {
          void ai.fillForm("Job context");
        }}
      >
        Fill with AI
      </button>
      <span data-testid="filled-fields">{Array.from(ai.filledFields).join(",")}</span>
      <span data-testid="ssn-value">{form.getValues("personal.ssn")}</span>
      <span data-testid="firstName-value">{form.getValues("personal.firstName")}</span>
      <span data-testid="title-value">{form.getValues("job.title")}</span>
    </div>
  );
}

// ── Tests ──────────────────────────────────────────────────────────

describe("@react-ai-form/react-hook-form integration", () => {
  beforeEach(() => {
    mockedStreamObject.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("complete fill flow — values populate, dirtyFields tracked", async () => {
    mockedStreamObject.mockReturnValue(
      mockStreamObject([
        { name: "Ada Lovelace" },
        { name: "Ada Lovelace", email: "ada@example.com" },
        { name: "Ada Lovelace", email: "ada@example.com", company: "Analytical Engine Co." },
        {
          name: "Ada Lovelace",
          email: "ada@example.com",
          company: "Analytical Engine Co.",
          message: "Excited to apply!",
        },
      ]),
    );

    render(<ContactForm />);

    await act(async () => {
      fireEvent.click(screen.getByText("Fill with AI"));
      await Promise.resolve();
    });

    await waitFor(() => {
      const values = JSON.parse(screen.getByTestId("values").textContent ?? "{}") as Contact;
      expect(values.name).toBe("Ada Lovelace");
      expect(values.email).toBe("ada@example.com");
    });
    const finalValues = JSON.parse(screen.getByTestId("values").textContent ?? "{}") as Contact;
    expect(finalValues.company).toBe("Analytical Engine Co.");
    expect(finalValues.message).toBe("Excited to apply!");
    expect(screen.getByTestId("dirty").textContent ?? "").toContain("name");
  });

  it("streaming populates fields progressively and updates progress counter", async () => {
    mockedStreamObject.mockReturnValue(
      mockStreamObject(
        [
          { name: "Ada" },
          { name: "Ada", email: "ada@x.com" },
          { name: "Ada", email: "ada@x.com", company: "X" },
          { name: "Ada", email: "ada@x.com", company: "X", message: "Hello world!!" },
        ],
        { delayMs: 5 },
      ),
    );

    render(<ContactForm />);

    await act(async () => {
      fireEvent.click(screen.getByText("Fill with AI"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("progress").textContent).toBe("4/4");
    });
  });

  it("privacy: ssn marked sensitive is excluded from streamed fill", async () => {
    mockedStreamObject.mockImplementation((opts) => {
      const schema = (opts as unknown as { schema: z.ZodObject<z.ZodRawShape> }).schema;
      // filterSchemaByPrivacy rebuilds nested objects, so `ssn` must be absent
      // from the INNER `personal` shape (not the outer one). Navigate into the
      // nested ZodObject and assert against its shape's keys directly.
      const personalShape = (schema.shape["personal"] as z.ZodObject<z.ZodRawShape>).shape;
      expect(Object.keys(personalShape)).not.toContain("ssn");
      // Positive check: other fields in the nested object survive the filter.
      expect(Object.keys(personalShape)).toEqual(
        expect.arrayContaining(["firstName", "lastName", "email"]),
      );
      return mockStreamObject([
        {
          personal: { firstName: "Ada", lastName: "Lovelace", email: "ada@x.com" },
          job: { title: "Engineer", company: "X", yearsExperience: 5 },
        },
      ]);
    });

    render(<ApplicationForm />);

    await act(async () => {
      fireEvent.click(screen.getByText("Fill with AI"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("firstName-value").textContent).toBe("Ada");
    });
    expect(screen.getByTestId("ssn-value").textContent).toBe("");
  });

  it("user editing during stream is preserved", async () => {
    let release: (() => void) | undefined;
    const blockerOnce = new Promise<void>((res) => {
      release = res;
    });

    async function* gatedStream(): AsyncIterable<Record<string, unknown>> {
      yield { name: "Ada" };
      await blockerOnce;
      yield { name: "Ada", email: "ada@x.com" };
    }

    mockedStreamObject.mockReturnValue({
      partialObjectStream: gatedStream(),
      object: Promise.resolve({ name: "Ada", email: "ada@x.com" }),
      usage: Promise.resolve({ promptTokens: 1, completionTokens: 1, totalTokens: 2 }),
    } as unknown as ReturnType<typeof streamObject>);

    render(<ContactForm />);

    fireEvent.click(screen.getByText("Fill with AI"));

    await waitFor(() => {
      const values = JSON.parse(screen.getByTestId("values").textContent ?? "{}") as Contact;
      expect(values.name).toBe("Ada");
    });

    // User types into name while stream is mid-flight. RHF's onChange marks
    // the field dirty, and our hook flags it as user-modified so further AI
    // updates skip it.
    const nameInput = screen.getByLabelText("name") as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: "Burhan" } });

    await act(async () => {
      release?.();
      await new Promise<void>((res) => setTimeout(res, 10));
    });

    await waitFor(() => {
      const values = JSON.parse(screen.getByTestId("values").textContent ?? "{}") as Contact;
      expect(values.name).toBe("Burhan");
      expect(values.email).toBe("ada@x.com");
    });
  });

  it("abort cancels the fill mid-stream", async () => {
    let release: (() => void) | undefined;
    const blocker = new Promise<void>((res) => {
      release = res;
    });

    async function* gatedStream(): AsyncIterable<Record<string, unknown>> {
      yield { name: "Ada" };
      await blocker;
      yield { name: "Ada", email: "ada@x.com" };
    }

    mockedStreamObject.mockReturnValue({
      partialObjectStream: gatedStream(),
      object: Promise.resolve({ name: "Ada", email: "ada@x.com" }),
      usage: Promise.resolve({ promptTokens: 1, completionTokens: 1, totalTokens: 2 }),
    } as unknown as ReturnType<typeof streamObject>);

    render(<ContactForm />);

    fireEvent.click(screen.getByText("Fill with AI"));

    await waitFor(() => {
      const values = JSON.parse(screen.getByTestId("values").textContent ?? "{}") as Contact;
      expect(values.name).toBe("Ada");
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Abort"));
      release?.();
      await new Promise<void>((res) => setTimeout(res, 10));
    });

    await waitFor(() => {
      expect(screen.getByTestId("filling").textContent).toBe("false");
    });
    const values = JSON.parse(screen.getByTestId("values").textContent ?? "{}") as Contact;
    expect(values.name).toBe("Ada");
    expect(values.email).toBe("");
  });

  it("nested fields populate via dot-notation paths", async () => {
    mockedStreamObject.mockReturnValue(
      mockStreamObject([
        {
          personal: { firstName: "Ada", lastName: "Lovelace", email: "ada@x.com" },
          job: { title: "Engineer", company: "Analytical Co.", yearsExperience: 5 },
        },
      ]),
    );

    render(<ApplicationForm />);

    await act(async () => {
      fireEvent.click(screen.getByText("Fill with AI"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("firstName-value").textContent).toBe("Ada");
      expect(screen.getByTestId("title-value").textContent).toBe("Engineer");
    });
  });

  it("validation runs after fill — invalid email surfaces a form error", async () => {
    mockedStreamObject.mockReturnValue(
      mockStreamObject([
        {
          name: "Ada",
          email: "not-an-email",
          company: "X",
          message: "Long enough message text.",
        },
      ]),
    );

    render(<ContactForm />);

    await act(async () => {
      fireEvent.click(screen.getByText("Fill with AI"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("error-email").textContent).not.toBe("");
    });
  });

  it("multiple fillForm calls — latest wins, previous aborted", async () => {
    let release: (() => void) | undefined;
    const firstBlocker = new Promise<void>((res) => {
      release = res;
    });

    async function* firstStream(): AsyncIterable<Record<string, unknown>> {
      yield { name: "First" };
      await firstBlocker;
      yield { name: "First-second-yield-should-be-skipped" };
    }

    mockedStreamObject.mockReturnValueOnce({
      partialObjectStream: firstStream(),
      object: Promise.resolve({}),
      usage: Promise.resolve({ promptTokens: 1, completionTokens: 1, totalTokens: 2 }),
    } as unknown as ReturnType<typeof streamObject>);
    mockedStreamObject.mockReturnValueOnce(
      mockStreamObject([
        { name: "Second", email: "s@x.com", company: "C", message: "Long enough." },
      ]),
    );

    render(<ContactForm />);

    fireEvent.click(screen.getByText("Fill with AI"));
    await waitFor(() => {
      const values = JSON.parse(screen.getByTestId("values").textContent ?? "{}") as Contact;
      expect(values.name).toBe("First");
    });

    // Second call aborts the first.
    fireEvent.click(screen.getByText("Fill with AI"));
    await waitFor(() => {
      const values = JSON.parse(screen.getByTestId("values").textContent ?? "{}") as Contact;
      expect(values.name).toBe("Second");
      expect(values.email).toBe("s@x.com");
    });
    // Release the first stream's blocker — since it was aborted, its second
    // yield must not overwrite the "Second" values.
    release?.();
    await new Promise<void>((res) => setTimeout(res, 5));
    const finalValues = JSON.parse(screen.getByTestId("values").textContent ?? "{}") as Contact;
    expect(finalValues.name).toBe("Second");
  });

  it("error handling: stream throws, error state set, form remains usable", async () => {
    mockedStreamObject.mockImplementation(() => {
      throw new Error("network down");
    });
    const onError = vi.fn();

    render(<ContactForm onApiError={onError} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Fill with AI"));
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });

    // Form still works.
    fireEvent.change(screen.getByLabelText("name") as HTMLInputElement, {
      target: { value: "Recovered" },
    });
    await waitFor(() => {
      const values = JSON.parse(screen.getByTestId("values").textContent ?? "{}") as Contact;
      expect(values.name).toBe("Recovered");
    });
  });

  it("fillForm twice emits onFillComplete each time", async () => {
    mockedStreamObject.mockReturnValue(
      mockStreamObject([
        { name: "Ada", email: "ada@x.com", company: "X", message: "Long enough." },
      ]),
    );
    const onComplete = vi.fn();

    render(<ContactForm onComplete={onComplete} />);

    await act(async () => {
      fireEvent.click(screen.getByText("Fill with AI"));
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    mockedStreamObject.mockReturnValue(
      mockStreamObject([
        { name: "Grace", email: "grace@x.com", company: "Y", message: "Another one!" },
      ]),
    );

    await act(async () => {
      fireEvent.click(screen.getByText("Fill with AI"));
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(2);
    });
  });
});
