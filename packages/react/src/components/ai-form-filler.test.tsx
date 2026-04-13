import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, act } from "@testing-library/react";
import { createRef, createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIFormFillerButton } from "./ai-form-filler";

describe("AIFormFillerButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders default state with 'Fill with AI' text", () => {
    render(createElement(AIFormFillerButton, { onFill: vi.fn() }));

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Fill with AI");
    expect(button).not.toBeDisabled();
  });

  it("shows loading state with progress text", () => {
    render(
      createElement(AIFormFillerButton, {
        onFill: vi.fn(),
        isLoading: true,
        progress: { filled: 3, total: 8 },
      }),
    );

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Filling... (3/8)");
  });

  it("is disabled during loading", () => {
    render(
      createElement(AIFormFillerButton, {
        onFill: vi.fn(),
        isLoading: true,
      }),
    );

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows 'Filled!' briefly after loading completes", () => {
    const { rerender } = render(
      createElement(AIFormFillerButton, {
        onFill: vi.fn(),
        isLoading: true,
      }),
    );

    // Transition to not loading
    rerender(
      createElement(AIFormFillerButton, {
        onFill: vi.fn(),
        isLoading: false,
      }),
    );

    expect(screen.getByRole("button")).toHaveTextContent("Filled!");

    // After 2 seconds, resets to default
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("button")).toHaveTextContent("Fill with AI");
  });

  it("headless mode passes props to child element", () => {
    const onFill = vi.fn();
    render(
      createElement(
        AIFormFillerButton,
        { onFill, asChild: true, isLoading: false },
        createElement("button", { "data-testid": "custom-btn" }, "Custom Fill"),
      ),
    );

    const button = screen.getByTestId("custom-btn");
    expect(button).toHaveTextContent("Custom Fill");

    fireEvent.click(button);
    expect(onFill).toHaveBeenCalledTimes(1);
  });

  it("icon variant renders with aria-label", () => {
    render(
      createElement(AIFormFillerButton, {
        onFill: vi.fn(),
        variant: "icon",
      }),
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "Fill form with AI");
    // Should not have text label
    expect(button.textContent).toBe("");
  });

  it("minimal variant renders text only without icon SVG", () => {
    render(
      createElement(AIFormFillerButton, {
        onFill: vi.fn(),
        variant: "minimal",
      }),
    );

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Fill with AI");
    expect(button.querySelector("svg")).toBeNull();
  });

  it("has aria-busy during loading", () => {
    render(
      createElement(AIFormFillerButton, {
        onFill: vi.fn(),
        isLoading: true,
      }),
    );

    expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
  });

  it("onClick calls onFill", () => {
    const onFill = vi.fn();
    render(createElement(AIFormFillerButton, { onFill }));

    fireEvent.click(screen.getByRole("button"));
    expect(onFill).toHaveBeenCalledTimes(1);
  });

  it("custom children override default label", () => {
    render(
      createElement(
        AIFormFillerButton,
        { onFill: vi.fn() },
        "Generate with AI",
      ),
    );

    expect(screen.getByRole("button")).toHaveTextContent("Generate with AI");
  });

  it("ref forwarding works", () => {
    const ref = createRef<HTMLButtonElement>();
    render(createElement(AIFormFillerButton, { onFill: vi.fn(), ref }));

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
