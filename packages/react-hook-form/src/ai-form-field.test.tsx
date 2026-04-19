import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIFormField, type AIFormFieldRenderProps, AITextField } from "./ai-form-field";
import { AIFormStatusProvider } from "./ai-form-status-context";

vi.mock("@react-ai-form/react", async () => {
  const actual =
    await vi.importActual<typeof import("@react-ai-form/react")>("@react-ai-form/react");
  return {
    ...actual,
    useAISuggestion: vi.fn(),
  };
});

import { useAISuggestion } from "@react-ai-form/react";

const mockedUseAISuggestion = vi.mocked(useAISuggestion);

interface FlatValues {
  firstName: string;
  lastName: string;
  email: string;
}

interface NestedValues {
  personal: { firstName: string };
}

function defaultSuggestionReturn(
  overrides: Partial<ReturnType<typeof useAISuggestion>> = {},
): ReturnType<typeof useAISuggestion> {
  return {
    suggestion: null,
    isLoading: false,
    error: null,
    accept: vi.fn(() => ""),
    dismiss: vi.fn(),
    refresh: vi.fn(),
    handleBlur: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useAISuggestion>;
}

interface FormRef<T extends FlatValues | NestedValues> {
  current: UseFormReturn<T> | null;
}

function createFormRef<T extends FlatValues | NestedValues>(): FormRef<T> {
  return { current: null };
}

function FlatHarness({
  formRef,
  children,
}: {
  formRef: FormRef<FlatValues>;
  children: (form: UseFormReturn<FlatValues>) => React.ReactNode;
}) {
  const form = useForm<FlatValues>({
    defaultValues: { firstName: "", lastName: "", email: "" },
  });
  formRef.current = form;
  return <>{children(form)}</>;
}

interface RenderRef<TName extends string> {
  current: AIFormFieldRenderProps<TName> | null;
}

function createRenderRef<TName extends string>(): RenderRef<TName> {
  return { current: null };
}

describe("AIFormField", () => {
  beforeEach(() => {
    mockedUseAISuggestion.mockReset();
    mockedUseAISuggestion.mockReturnValue(defaultSuggestionReturn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("invokes the render prop with field, fieldState, suggestion, and aiStatus", () => {
    const formRef = createFormRef<FlatValues>();
    const captured = createRenderRef<"firstName">();

    render(
      <FlatHarness formRef={formRef}>
        {(form) => (
          <AIFormField<FlatValues, "firstName">
            form={form}
            name="firstName"
            render={(props) => {
              captured.current = props;
              return <input {...props.field} />;
            }}
          />
        )}
      </FlatHarness>,
    );

    expect(captured.current).not.toBeNull();
    expect(captured.current?.field.name).toBe("firstName");
    expect(captured.current?.fieldState.isDirty).toBe(false);
    expect(captured.current?.suggestion).toBeNull();
    expect(captured.current?.aiStatus).toBe("empty");
  });

  it("does not enable useAISuggestion when aiSuggestion=false", () => {
    const formRef = createFormRef<FlatValues>();

    render(
      <FlatHarness formRef={formRef}>
        {(form) => (
          <AIFormField<FlatValues, "firstName">
            form={form}
            name="firstName"
            render={({ field }) => <input {...field} />}
          />
        )}
      </FlatHarness>,
    );

    expect(mockedUseAISuggestion).toHaveBeenCalled();
    const opts = mockedUseAISuggestion.mock.calls[0]?.[0];
    expect(opts?.enabled).toBe(false);
  });

  it("enables useAISuggestion and surfaces suggestion text when aiSuggestion=true", () => {
    mockedUseAISuggestion.mockReturnValue(
      defaultSuggestionReturn({ suggestion: "hn Doe", accept: vi.fn(() => "John Doe") }),
    );
    const formRef = createFormRef<FlatValues>();
    const captured = createRenderRef<"firstName">();

    render(
      <FlatHarness formRef={formRef}>
        {(form) => (
          <AIFormField<FlatValues, "firstName">
            form={form}
            name="firstName"
            aiSuggestion
            render={(props) => {
              captured.current = props;
              return <input {...props.field} />;
            }}
          />
        )}
      </FlatHarness>,
    );

    expect(captured.current?.suggestion).toBe("hn Doe");
    const opts = mockedUseAISuggestion.mock.calls[0]?.[0];
    expect(opts?.enabled).toBe(true);
  });

  it("acceptSuggestion writes the full value into the form via setValue", () => {
    mockedUseAISuggestion.mockReturnValue(
      defaultSuggestionReturn({
        suggestion: "hn Doe",
        accept: vi.fn(() => "John Doe"),
      }),
    );
    const formRef = createFormRef<FlatValues>();
    const captured = createRenderRef<"firstName">();

    render(
      <FlatHarness formRef={formRef}>
        {(form) => (
          <AIFormField<FlatValues, "firstName">
            form={form}
            name="firstName"
            aiSuggestion
            render={(props) => {
              captured.current = props;
              return <input {...props.field} />;
            }}
          />
        )}
      </FlatHarness>,
    );

    captured.current?.acceptSuggestion();

    expect(formRef.current?.getValues("firstName")).toBe("John Doe");
  });

  it("derives aiStatus from AIFormStatusProvider when present", () => {
    const lookup = vi.fn().mockReturnValue("ai-filled" as const);
    const formRef = createFormRef<FlatValues>();
    const captured = createRenderRef<"firstName">();

    render(
      <FlatHarness formRef={formRef}>
        {(form) => (
          <AIFormStatusProvider getFieldStatus={lookup}>
            <AIFormField<FlatValues, "firstName">
              form={form}
              name="firstName"
              render={(props) => {
                captured.current = props;
                return <input {...props.field} />;
              }}
            />
          </AIFormStatusProvider>
        )}
      </FlatHarness>,
    );

    expect(lookup).toHaveBeenCalledWith("firstName");
    expect(captured.current?.aiStatus).toBe("ai-filled");
  });

  it("supports nested field paths", () => {
    const captured = createRenderRef<"personal.firstName">();
    function Nested() {
      const form = useForm<NestedValues>({ defaultValues: { personal: { firstName: "" } } });
      return (
        <AIFormField<NestedValues, "personal.firstName">
          form={form}
          name="personal.firstName"
          render={(props) => {
            captured.current = props;
            return <input {...props.field} />;
          }}
        />
      );
    }

    render(<Nested />);

    expect(captured.current?.field.name).toBe("personal.firstName");
  });
});

describe("AITextField", () => {
  beforeEach(() => {
    mockedUseAISuggestion.mockReset();
    mockedUseAISuggestion.mockReturnValue(defaultSuggestionReturn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders label, input, and confidence badge", () => {
    const formRef = createFormRef<FlatValues>();

    render(
      <FlatHarness formRef={formRef}>
        {(form) => (
          <AIFormStatusProvider getFieldStatus={() => "ai-filled"}>
            <AITextField<FlatValues, "firstName">
              form={form}
              name="firstName"
              label="First name"
              placeholder="Ada"
            />
          </AIFormStatusProvider>
        )}
      </FlatHarness>,
    );

    expect(screen.getByText("First name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ada")).toBeInTheDocument();
    expect(screen.getByLabelText(/AI/i)).toBeInTheDocument();
  });

  it("hides the badge when aiBadge=false", () => {
    const formRef = createFormRef<FlatValues>();

    render(
      <FlatHarness formRef={formRef}>
        {(form) => (
          <AIFormStatusProvider getFieldStatus={() => "ai-filled"}>
            <AITextField<FlatValues, "firstName">
              form={form}
              name="firstName"
              label="First name"
              aiBadge={false}
            />
          </AIFormStatusProvider>
        )}
      </FlatHarness>,
    );

    expect(screen.queryByLabelText(/AI suggested/i)).toBeNull();
  });

  it("renders the field error message when the field has a validation error", async () => {
    function Harness() {
      const form = useForm<FlatValues>({
        defaultValues: { firstName: "", lastName: "", email: "" },
      });
      return (
        <>
          <AITextField<FlatValues, "firstName"> form={form} name="firstName" label="First name" />
          <button
            type="button"
            onClick={() => {
              form.setError("firstName", { type: "manual", message: "too short" });
            }}
          >
            invalidate
          </button>
        </>
      );
    }

    render(<Harness />);

    fireEvent.click(screen.getByText("invalidate"));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("too short");
  });

  // ── Accessibility tests ────────────────────────────────────────

  it("announces new suggestions via aria-live polite region", () => {
    // Start with no suggestion so lastAnnouncedRef is null, then rerender with
    // a suggestion so the diff triggers the announcement (matches the component's
    // own test pattern).
    mockedUseAISuggestion.mockReturnValue(defaultSuggestionReturn());
    const formRef = createFormRef<FlatValues>();

    const { rerender } = render(
      <FlatHarness formRef={formRef}>
        {(form) => (
          <AITextField<FlatValues, "firstName"> form={form} name="firstName" label="First name" />
        )}
      </FlatHarness>,
    );

    const live = screen.getByRole("status");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveTextContent("");

    mockedUseAISuggestion.mockReturnValue(
      defaultSuggestionReturn({ suggestion: "hn Doe", accept: vi.fn(() => "John Doe") }),
    );
    rerender(
      <FlatHarness formRef={formRef}>
        {(form) => (
          <AITextField<FlatValues, "firstName"> form={form} name="firstName" label="First name" />
        )}
      </FlatHarness>,
    );

    expect(live).toHaveTextContent(/Suggestion available: hn Doe/);
    expect(live).toHaveTextContent(/Tab to accept/i);
  });

  it("exposes accept/dismiss keyboard instructions via aria-describedby", () => {
    mockedUseAISuggestion.mockReturnValue(
      defaultSuggestionReturn({ suggestion: "hn Doe", accept: vi.fn(() => "John Doe") }),
    );
    const formRef = createFormRef<FlatValues>();

    render(
      <FlatHarness formRef={formRef}>
        {(form) => (
          <AITextField<FlatValues, "firstName"> form={form} name="firstName" label="First name" />
        )}
      </FlatHarness>,
    );

    const input = screen.getByLabelText("First name") as HTMLInputElement;
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).not.toBeNull();

    const instruction = document.getElementById(describedBy as string);
    expect(instruction).not.toBeNull();
    expect(instruction?.textContent).toMatch(/Tab to accept/i);
    expect(instruction?.textContent).toMatch(/Escape to dismiss/i);
  });

  it("accepts the suggestion on Tab and writes the full value back into the form", () => {
    mockedUseAISuggestion.mockReturnValue(
      defaultSuggestionReturn({
        suggestion: "hn Doe",
        accept: vi.fn(() => "John Doe"),
      }),
    );
    const formRef = createFormRef<FlatValues>();

    render(
      <FlatHarness formRef={formRef}>
        {(form) => (
          <AITextField<FlatValues, "firstName"> form={form} name="firstName" label="First name" />
        )}
      </FlatHarness>,
    );

    const input = screen.getByLabelText("First name") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Tab" });

    expect(formRef.current?.getValues("firstName")).toBe("John Doe");
  });

  it("dismisses the suggestion on Escape", () => {
    const dismiss = vi.fn();
    mockedUseAISuggestion.mockReturnValue(
      defaultSuggestionReturn({
        suggestion: "hn Doe",
        dismiss,
      }),
    );
    const formRef = createFormRef<FlatValues>();

    render(
      <FlatHarness formRef={formRef}>
        {(form) => (
          <AITextField<FlatValues, "firstName"> form={form} name="firstName" label="First name" />
        )}
      </FlatHarness>,
    );

    const input = screen.getByLabelText("First name") as HTMLInputElement;
    fireEvent.keyDown(input, { key: "Escape" });

    expect(dismiss).toHaveBeenCalled();
  });
});
