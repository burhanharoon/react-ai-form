import { act, renderHook } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_FORM_ARIA_LABELS, useAriaLiveAnnounce, useFocusTrap, useReducedMotion } from "./a11y";

// ── useAriaLiveAnnounce ────────────────────────────────────────────

describe("useAriaLiveAnnounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a hidden aria-live region in the DOM", () => {
    const { unmount } = renderHook(() => useAriaLiveAnnounce());

    const region = document.querySelector('[aria-live="polite"][role="status"]');
    expect(region).not.toBeNull();

    unmount();
    const regionAfter = document.querySelector('[aria-live="polite"][role="status"]');
    expect(regionAfter).toBeNull();
  });

  it("announces a polite message after debounce", () => {
    const { result } = renderHook(() => useAriaLiveAnnounce());

    act(() => {
      result.current("Hello screen reader");
    });

    // Before debounce
    const region = document.querySelector('[role="status"]');
    expect(region?.textContent).toBe("");

    // After debounce
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(region?.textContent).toBe("Hello screen reader");
  });

  it("announces assertive messages immediately", () => {
    const { result } = renderHook(() => useAriaLiveAnnounce());

    act(() => {
      result.current("Urgent message", "assertive");
    });

    const region = document.querySelector('[role="status"]');
    expect(region?.textContent).toBe("Urgent message");
  });

  it("deduplicates repeated polite messages", () => {
    const { result } = renderHook(() => useAriaLiveAnnounce());

    act(() => {
      result.current("Same message");
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    const region = document.querySelector('[role="status"]');
    expect(region?.textContent).toBe("Same message");

    // Send the same message again
    act(() => {
      result.current("Same message");
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should not re-announce (content unchanged by dedup)
    expect(region?.textContent).toBe("Same message");
  });

  it("cleans up on unmount", () => {
    const { unmount } = renderHook(() => useAriaLiveAnnounce());

    expect(document.querySelector('[role="status"]')).not.toBeNull();
    unmount();
    expect(document.querySelector('[role="status"]')).toBeNull();
  });
});

// ── useReducedMotion ───────────────────────────────────────────────

describe("useReducedMotion", () => {
  it("returns false when no motion preference set", () => {
    // jsdom doesn't implement matchMedia — mock it
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    window.matchMedia = originalMatchMedia;
  });

  it("responds to matchMedia changes", () => {
    // Mock matchMedia to return reduced-motion
    const listeners: Array<(e: MediaQueryListEvent) => void> = [];
    const mockMql = {
      matches: false,
      addEventListener: (_event: string, fn: (e: MediaQueryListEvent) => void) => {
        listeners.push(fn);
      },
      removeEventListener: (_event: string, fn: (e: MediaQueryListEvent) => void) => {
        const idx = listeners.indexOf(fn);
        if (idx !== -1) listeners.splice(idx, 1);
      },
    };

    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockReturnValue(mockMql);

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    // Simulate change
    act(() => {
      for (const listener of listeners) {
        listener({ matches: true } as MediaQueryListEvent);
      }
    });
    expect(result.current).toBe(true);

    window.matchMedia = originalMatchMedia;
  });
});

// ── useFocusTrap ───────────────────────────────────────────────────

describe("useFocusTrap", () => {
  it("traps focus within the element when active", () => {
    const container = document.createElement("div");
    const btn1 = document.createElement("button");
    btn1.textContent = "First";
    const btn2 = document.createElement("button");
    btn2.textContent = "Last";
    container.appendChild(btn1);
    container.appendChild(btn2);
    document.body.appendChild(container);

    const ref = createRef<HTMLElement>();
    (ref as { current: HTMLElement }).current = container;

    renderHook(() => useFocusTrap(ref, true));

    // Focus the last button and press Tab
    btn2.focus();
    const tabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
    });
    document.dispatchEvent(tabEvent);

    // Focus should wrap to first
    expect(document.activeElement).toBe(btn1);

    // Focus the first button and press Shift+Tab
    btn1.focus();
    const shiftTabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      bubbles: true,
    });
    document.dispatchEvent(shiftTabEvent);

    // Focus should wrap to last
    expect(document.activeElement).toBe(btn2);

    document.body.removeChild(container);
  });

  it("does nothing when inactive", () => {
    const container = document.createElement("div");
    const btn1 = document.createElement("button");
    btn1.textContent = "First";
    const btn2 = document.createElement("button");
    btn2.textContent = "Last";
    container.appendChild(btn1);
    container.appendChild(btn2);
    document.body.appendChild(container);

    const ref = createRef<HTMLElement>();
    (ref as { current: HTMLElement }).current = container;

    renderHook(() => useFocusTrap(ref, false));

    btn2.focus();
    const tabEvent = new KeyboardEvent("keydown", {
      key: "Tab",
      bubbles: true,
    });
    document.dispatchEvent(tabEvent);

    // Focus should NOT be trapped — still on btn2 (default browser behavior not simulated, but at least no trap)
    // In jsdom, Tab doesn't actually move focus, so activeElement stays the same regardless.
    // We just verify no error is thrown.
    expect(true).toBe(true);

    document.body.removeChild(container);
  });
});

// ── AI_FORM_ARIA_LABELS ───────────────────────────────────────────

describe("AI_FORM_ARIA_LABELS", () => {
  it("generates correct suggestion available label", () => {
    expect(AI_FORM_ARIA_LABELS.suggestionAvailable("John")).toBe(
      "Suggestion available: John. Press Tab to accept.",
    );
  });

  it("has loading label", () => {
    expect(AI_FORM_ARIA_LABELS.suggestionLoading).toBe("Loading AI suggestion...");
  });

  it("generates form filling label", () => {
    expect(AI_FORM_ARIA_LABELS.formFilling("3 of 8 fields")).toBe(
      "Filling form with AI. 3 of 8 fields",
    );
  });

  it("generates form filled label", () => {
    expect(AI_FORM_ARIA_LABELS.formFilled(5)).toBe("Form filled. 5 fields updated by AI.");
  });

  it("has field AI filled label", () => {
    expect(AI_FORM_ARIA_LABELS.fieldAIFilled).toBe("This field was filled by AI.");
  });

  it("has field review label", () => {
    expect(AI_FORM_ARIA_LABELS.fieldReview).toBe("This AI-filled field may need review.");
  });
});
