import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

// ── useAriaLiveAnnounce ────────────────────────────────────────────

/**
 * Manages a hidden aria-live region for screen reader announcements.
 * Deduplicates rapid polite announcements with a 500ms debounce.
 *
 * @returns An `announce` function that pushes messages to the live region.
 */
export function useAriaLiveAnnounce(): (
  message: string,
  priority?: "polite" | "assertive",
) => void {
  const regionRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMessageRef = useRef<string>("");

  // Create and clean up the live region element
  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-atomic", "true");
    el.setAttribute("role", "status");
    Object.assign(el.style, {
      position: "absolute",
      width: "1px",
      height: "1px",
      padding: "0",
      margin: "-1px",
      overflow: "hidden",
      clip: "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      border: "0",
    });
    document.body.appendChild(el);
    regionRef.current = el;

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      document.body.removeChild(el);
      regionRef.current = null;
    };
  }, []);

  return useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      const region = regionRef.current;
      if (!region) return;

      region.setAttribute("aria-live", priority);

      if (priority === "assertive") {
        // Assertive announcements fire immediately
        region.textContent = message;
        lastMessageRef.current = message;
        return;
      }

      // Debounce polite announcements (500ms)
      if (message === lastMessageRef.current) return;

      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        if (region) {
          region.textContent = message;
          lastMessageRef.current = message;
        }
      }, 500);
    },
    [],
  );
}

// ── useReducedMotion ───────────────────────────────────────────────

/**
 * Returns `true` if the user has requested reduced motion via their OS settings.
 * Listens for changes via `matchMedia`.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => {
      setReduced(e.matches);
    };
    mql.addEventListener("change", handler);
    return () => {
      mql.removeEventListener("change", handler);
    };
  }, []);

  return reduced;
}

// ── useFocusTrap ───────────────────────────────────────────────────

const FOCUSABLE_SELECTOR =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/**
 * Traps keyboard focus within the referenced element when `active` is true.
 * Tab cycles through focusable children; Shift+Tab goes backwards.
 */
export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !ref.current) return;

      const focusable = Array.from(
        ref.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) return;

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [ref, active]);
}

// ── ARIA label constants ───────────────────────────────────────────

/**
 * Standard ARIA label templates used across AI form components.
 */
export const AI_FORM_ARIA_LABELS = {
  /** Announcement when a suggestion becomes available. */
  suggestionAvailable: (text: string) =>
    `Suggestion available: ${text}. Press Tab to accept.`,

  /** Announcement while a suggestion is loading. */
  suggestionLoading: "Loading AI suggestion...",

  /** Announcement during form fill progress. */
  formFilling: (progress: string) =>
    `Filling form with AI. ${progress}`,

  /** Announcement when form fill completes. */
  formFilled: (count: number) =>
    `Form filled. ${count} fields updated by AI.`,

  /** Label for an AI-filled field. */
  fieldAIFilled: "This field was filled by AI.",

  /** Label for an AI-filled field needing review. */
  fieldReview: "This AI-filled field may need review.",
} as const;
