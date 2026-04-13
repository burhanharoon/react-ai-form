import type { InputHTMLAttributes, KeyboardEvent } from "react";
import { forwardRef, useEffect, useId, useRef } from "react";
import "./ai-field-suggestion.css";

// ── Props ─────────────────────────────────────────────────────────

/**
 * Props for the {@link AIFieldSuggestion} component.
 *
 * Extends native `<input>` attributes so all standard props (placeholder,
 * disabled, className, etc.) pass through to the underlying input element.
 */
export interface AIFieldSuggestionProps extends InputHTMLAttributes<HTMLInputElement> {
  /** The AI-generated suggestion text, or `null` when no suggestion is available. */
  suggestion: string | null;

  /** Called when the user accepts the current suggestion (e.g. via Tab). */
  onAccept: () => void;

  /** Called when the user dismisses the current suggestion (e.g. via Escape). */
  onDismiss?: (() => void) | undefined;

  /** Whether a suggestion is currently being fetched from the AI. */
  isLoading?: boolean | undefined;

  /** Additional CSS class name applied to the suggestion ghost text span. */
  suggestionClassName?: string | undefined;

  /** Which key accepts the suggestion. Defaults to `'Tab'`. */
  acceptKey?: "Tab" | "ArrowRight" | "Enter" | undefined;

  /** Whether to show a "Tab to accept" shortcut hint. Defaults to `true`. */
  showShortcutHint?: boolean | undefined;
}

// ── Key name mapping for the shortcut hint ────────────────────────

const ACCEPT_KEY_LABELS: Record<string, string> = {
  Tab: "Tab",
  ArrowRight: "\u2192",
  Enter: "\u21B5",
};

// ── Component ─────────────────────────────────────────────────────

/**
 * An accessible ghost-text suggestion component that renders inline AI
 * suggestions (like Gmail Smart Compose or GitHub Copilot).
 *
 * Uses a two-layer CSS technique: a transparent `<input>` on top captures
 * all user interaction, while a gray suggestion `<span>` behind it shows
 * the dimmed completion text.
 *
 * @example
 * ```tsx
 * <AIFieldSuggestion
 *   value={fieldValue}
 *   onChange={handleChange}
 *   suggestion={suggestion}
 *   onAccept={handleAccept}
 *   onDismiss={handleDismiss}
 *   isLoading={isLoading}
 * />
 * ```
 */
export const AIFieldSuggestion = forwardRef<HTMLInputElement, AIFieldSuggestionProps>(
  function AIFieldSuggestion(
    {
      suggestion,
      onAccept,
      onDismiss,
      isLoading = false,
      suggestionClassName,
      acceptKey = "Tab",
      showShortcutHint = true,
      onKeyDown,
      value,
      ...inputProps
    },
    ref,
  ) {
    const uniqueId = useId();
    const instructionId = `${uniqueId}-instruction`;
    const liveRegionId = `${uniqueId}-live`;

    // Track the last announced suggestion to avoid re-announcing the same text
    const lastAnnouncedRef = useRef<string | null>(null);

    // Determine what the live region should currently say
    const hasSuggestion = suggestion !== null && suggestion !== "";

    // Update the live region text only when a genuinely new suggestion arrives
    const liveText = (() => {
      if (isLoading) {
        return "Loading suggestion...";
      }
      if (hasSuggestion && suggestion !== lastAnnouncedRef.current) {
        return `Suggestion available: ${suggestion}. Press ${ACCEPT_KEY_LABELS[acceptKey] ?? acceptKey} to accept.`;
      }
      return "";
    })();

    // After rendering, record what we announced
    useEffect(() => {
      if (hasSuggestion) {
        lastAnnouncedRef.current = suggestion;
      } else {
        lastAnnouncedRef.current = null;
      }
    }, [suggestion, hasSuggestion]);

    // Keyboard handler
    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
      // Forward to user-provided handler first
      onKeyDown?.(e);

      // If the user's handler prevented default, bail out
      if (e.defaultPrevented) {
        return;
      }

      if (!hasSuggestion) {
        return;
      }

      // Accept key
      if (e.key === acceptKey) {
        e.preventDefault();
        onAccept();
        return;
      }

      // ArrowRight at the end of text also accepts (like GitHub Copilot)
      if (e.key === "ArrowRight") {
        const input = e.currentTarget;
        const cursorAtEnd =
          input.selectionStart === input.selectionEnd &&
          input.selectionStart === String(value ?? "").length;
        if (cursorAtEnd) {
          e.preventDefault();
          onAccept();
          return;
        }
      }

      // Escape dismisses
      if (e.key === "Escape") {
        e.preventDefault();
        onDismiss?.();
      }
    }

    const currentValue = String(value ?? "");

    return (
      <div data-ai-suggestion="" data-ai-loading={isLoading ? "true" : undefined}>
        {/* Top layer: the real input */}
        <input
          ref={ref}
          value={value}
          onKeyDown={handleKeyDown}
          {...inputProps}
          aria-describedby={
            inputProps["aria-describedby"]
              ? `${instructionId} ${inputProps["aria-describedby"]}`
              : instructionId
          }
        />

        {/* Bottom layer: the suggestion mirror */}
        {/* Mirror copies the input's style prop so custom padding/font/border stay aligned */}
        {hasSuggestion && (
          <span
            className={`ai-field-suggestion__mirror${inputProps.className ? ` ${inputProps.className}` : ""}${suggestionClassName ? ` ${suggestionClassName}` : ""}`}
            style={inputProps.style}
            aria-hidden="true"
          >
            <span className="ai-field-suggestion__value">{currentValue}</span>
            <span className="ai-field-suggestion__completion">{suggestion}</span>
          </span>
        )}

        {/* Shortcut hint */}
        {showShortcutHint && hasSuggestion && !isLoading && (
          <span className="ai-field-suggestion__hint" aria-hidden="true">
            {ACCEPT_KEY_LABELS[acceptKey] ?? acceptKey} to accept
          </span>
        )}

        {/* Screen-reader-only instruction text */}
        <span id={instructionId} className="ai-field-suggestion__sr-only">
          AI suggestions are available. Press {ACCEPT_KEY_LABELS[acceptKey] ?? acceptKey} to accept
          or Escape to dismiss.
        </span>

        {/* Live region for announcing new suggestions */}
        <span
          id={liveRegionId}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="ai-field-suggestion__sr-only"
        >
          {liveText}
        </span>
      </div>
    );
  },
);
