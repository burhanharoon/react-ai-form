import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { AIFieldSuggestion } from "./ai-field-suggestion";

describe("AIFieldSuggestion", () => {
  it("renders input with ghost text overlay", () => {
    render(
      <AIFieldSuggestion value="Hel" suggestion="lo World" onAccept={vi.fn()} onChange={vi.fn()} />,
    );

    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();

    // The suggestion mirror should be present with aria-hidden
    const completionSpan = screen.getByText("lo World");
    expect(completionSpan).toBeInTheDocument();
  });

  it("Tab key calls onAccept", () => {
    const onAccept = vi.fn();
    render(
      <AIFieldSuggestion
        value="Hel"
        suggestion="lo World"
        onAccept={onAccept}
        onChange={vi.fn()}
      />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Tab" });

    expect(onAccept).toHaveBeenCalledOnce();
  });

  it("Escape key calls onDismiss", () => {
    const onDismiss = vi.fn();
    render(
      <AIFieldSuggestion
        value="Hel"
        suggestion="lo World"
        onAccept={vi.fn()}
        onDismiss={onDismiss}
        onChange={vi.fn()}
      />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Escape" });

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("ghost text not visible when suggestion is null", () => {
    render(
      <AIFieldSuggestion value="Hello" suggestion={null} onAccept={vi.fn()} onChange={vi.fn()} />,
    );

    // The mirror span should not be rendered
    expect(screen.queryByText("lo World")).not.toBeInTheDocument();
    // No shortcut hint should be visible (the "Tab to accept" hint element)
    expect(screen.queryByText("Tab to accept")).not.toBeInTheDocument();
  });

  it("aria-live announces new suggestions", () => {
    const { rerender } = render(
      <AIFieldSuggestion value="Hel" suggestion={null} onAccept={vi.fn()} onChange={vi.fn()} />,
    );

    // Initially no announcement
    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveTextContent("");

    // Rerender with a suggestion
    rerender(
      <AIFieldSuggestion value="Hel" suggestion="lo World" onAccept={vi.fn()} onChange={vi.fn()} />,
    );

    expect(liveRegion).toHaveTextContent("Suggestion available: lo World. Press Tab to accept.");
  });

  it("aria-hidden on suggestion span", () => {
    render(
      <AIFieldSuggestion value="Hel" suggestion="lo World" onAccept={vi.fn()} onChange={vi.fn()} />,
    );

    // The mirror container should be aria-hidden
    const mirrorSpan = screen.getByText("lo World").closest(".ai-field-suggestion__mirror");
    expect(mirrorSpan).toHaveAttribute("aria-hidden", "true");
  });

  it("ref forwarding works", () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <AIFieldSuggestion
        ref={ref}
        value="test"
        suggestion={null}
        onAccept={vi.fn()}
        onChange={vi.fn()}
      />,
    );

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.value).toBe("test");
  });

  it("all input props pass through (placeholder, disabled, className)", () => {
    render(
      <AIFieldSuggestion
        value=""
        suggestion={null}
        onAccept={vi.fn()}
        onChange={vi.fn()}
        placeholder="Enter name"
        disabled
        className="custom-class"
        data-testid="my-input"
      />,
    );

    const input = screen.getByRole("textbox");
    expect(input).toHaveAttribute("placeholder", "Enter name");
    expect(input).toBeDisabled();
    expect(input).toHaveClass("custom-class");
    expect(input).toHaveAttribute("data-testid", "my-input");
  });

  it("custom acceptKey works", () => {
    const onAccept = vi.fn();
    render(
      <AIFieldSuggestion
        value="Hel"
        suggestion="lo World"
        onAccept={onAccept}
        onChange={vi.fn()}
        acceptKey="Enter"
      />,
    );

    const input = screen.getByRole("textbox");

    // Tab should NOT accept when acceptKey is Enter
    fireEvent.keyDown(input, { key: "Tab" });
    expect(onAccept).not.toHaveBeenCalled();

    // Enter should accept
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it("ArrowRight at end of input accepts suggestion", () => {
    const onAccept = vi.fn();
    render(
      <AIFieldSuggestion
        value="Hel"
        suggestion="lo World"
        onAccept={onAccept}
        onChange={vi.fn()}
      />,
    );

    const input = screen.getByRole("textbox");

    // Simulate cursor at end of input
    // In jsdom, selectionStart/selectionEnd default to the end of value
    // We need to explicitly set them to match the value length
    Object.defineProperty(input, "selectionStart", { value: 3, writable: true });
    Object.defineProperty(input, "selectionEnd", { value: 3, writable: true });

    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(onAccept).toHaveBeenCalledOnce();
  });

  it("does not accept ArrowRight when cursor is not at end", () => {
    const onAccept = vi.fn();
    render(
      <AIFieldSuggestion
        value="Hel"
        suggestion="lo World"
        onAccept={onAccept}
        onChange={vi.fn()}
      />,
    );

    const input = screen.getByRole("textbox");

    // Simulate cursor in the middle of input
    Object.defineProperty(input, "selectionStart", { value: 1, writable: true });
    Object.defineProperty(input, "selectionEnd", { value: 1, writable: true });

    fireEvent.keyDown(input, { key: "ArrowRight" });
    expect(onAccept).not.toHaveBeenCalled();
  });

  it("announces loading state via aria-live", () => {
    render(
      <AIFieldSuggestion
        value="Hel"
        suggestion={null}
        onAccept={vi.fn()}
        onChange={vi.fn()}
        isLoading
      />,
    );

    const liveRegion = screen.getByRole("status");
    expect(liveRegion).toHaveTextContent("Loading suggestion...");
  });

  it("forwards onKeyDown handler to user", () => {
    const onKeyDown = vi.fn();
    render(
      <AIFieldSuggestion
        value="Hel"
        suggestion="lo World"
        onAccept={vi.fn()}
        onChange={vi.fn()}
        onKeyDown={onKeyDown}
      />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.keyDown(input, { key: "Tab" });

    // The user's onKeyDown should still be called
    expect(onKeyDown).toHaveBeenCalledOnce();
  });

  it("shows shortcut hint when suggestion is available", () => {
    render(
      <AIFieldSuggestion value="Hel" suggestion="lo World" onAccept={vi.fn()} onChange={vi.fn()} />,
    );

    expect(screen.getByText("Tab to accept")).toBeInTheDocument();
  });

  it("hides shortcut hint when showShortcutHint is false", () => {
    render(
      <AIFieldSuggestion
        value="Hel"
        suggestion="lo World"
        onAccept={vi.fn()}
        onChange={vi.fn()}
        showShortcutHint={false}
      />,
    );

    expect(screen.queryByText("Tab to accept")).not.toBeInTheDocument();
  });

  it("has aria-describedby pointing to instruction text", () => {
    render(
      <AIFieldSuggestion value="Hel" suggestion="lo World" onAccept={vi.fn()} onChange={vi.fn()} />,
    );

    const input = screen.getByRole("textbox");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();

    const instructionEl = describedBy ? document.getElementById(describedBy) : null;
    expect(instructionEl).toHaveTextContent(
      "AI suggestions are available. Press Tab to accept or Escape to dismiss.",
    );
  });

  it("sets data-ai-suggestion attribute on container", () => {
    const { container } = render(
      <AIFieldSuggestion value="Hel" suggestion="lo World" onAccept={vi.fn()} onChange={vi.fn()} />,
    );

    const wrapper = container.querySelector("[data-ai-suggestion]");
    expect(wrapper).toBeInTheDocument();
  });

  it("sets data-ai-loading attribute when loading", () => {
    const { container } = render(
      <AIFieldSuggestion
        value="Hel"
        suggestion={null}
        onAccept={vi.fn()}
        onChange={vi.fn()}
        isLoading
      />,
    );

    const wrapper = container.querySelector("[data-ai-loading='true']");
    expect(wrapper).toBeInTheDocument();
  });
});
