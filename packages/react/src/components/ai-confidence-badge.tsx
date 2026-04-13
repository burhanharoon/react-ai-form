import type { JSX } from "react";
import "./ai-confidence-badge.css";

/**
 * Props for the {@link AIConfidenceBadge} component.
 *
 * Displays a visual indicator for AI-filled form fields, showing the
 * confidence level of the AI suggestion or whether the user has edited
 * the value after AI fill.
 */
export interface AIConfidenceBadgeProps {
  /** Current status of the field relative to AI fill. */
  status: "ai-filled" | "user-modified" | "empty";
  /** Confidence level of the AI-generated value. Only relevant when status is `'ai-filled'`. */
  confidence?: "high" | "medium" | "low" | undefined;
  /** Size variant for the badge. Defaults to `'sm'`. */
  size?: "sm" | "md" | undefined;
  /** Whether to show the text label alongside the icon. Defaults to `true`. */
  showLabel?: boolean | undefined;
  /** Additional CSS class name(s) to apply to the badge container. */
  className?: string | undefined;
}

/**
 * Small inline SVG sparkle icon (4-pointed star) used for AI-filled status.
 */
function SparkleIcon(): JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M6 0L7.5 4.5L12 6L7.5 7.5L6 12L4.5 7.5L0 6L4.5 4.5L6 0Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Small inline SVG pencil/edit icon used for user-modified status.
 */
function PencilIcon(): JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M8.5 1.5L10.5 3.5L3.5 10.5H1.5V8.5L8.5 1.5Z" fill="currentColor" />
    </svg>
  );
}

/**
 * Returns the accessible description for the given status and confidence.
 */
function getAriaLabel(
  status: "ai-filled" | "user-modified",
  confidence: "high" | "medium" | "low",
): string {
  if (status === "user-modified") {
    return "This field was edited after AI fill";
  }

  if (confidence === "low") {
    return "This field was filled by AI and may need review";
  }

  if (confidence === "medium") {
    return "This field was filled by AI with medium confidence";
  }

  return "This field was filled by AI with high confidence";
}

/**
 * A visual badge indicator for AI-filled form fields.
 *
 * Shows the AI fill status and confidence level using color-coded icons
 * and labels. Renders nothing when status is `'empty'`.
 *
 * @example
 * ```tsx
 * <AIConfidenceBadge status="ai-filled" confidence="high" />
 * <AIConfidenceBadge status="ai-filled" confidence="low" />
 * <AIConfidenceBadge status="user-modified" />
 * ```
 */
export function AIConfidenceBadge({
  status,
  confidence,
  size,
  showLabel,
  className,
}: AIConfidenceBadgeProps): JSX.Element | null {
  if (status === "empty") {
    return null;
  }

  const resolvedSize = size ?? "sm";
  const resolvedShowLabel = showLabel ?? true;
  const resolvedConfidence = status === "ai-filled" ? (confidence ?? "high") : undefined;

  const ariaLabel = getAriaLabel(status, resolvedConfidence ?? "high");

  const label =
    status === "user-modified" ? "Edited" : resolvedConfidence === "low" ? "AI (review)" : "AI";

  const classes = className ? className : undefined;

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={classes}
      data-ai-confidence={status}
      data-ai-confidence-level={resolvedConfidence}
      data-ai-confidence-size={resolvedSize}
    >
      {status === "user-modified" ? <PencilIcon /> : <SparkleIcon />}
      {resolvedShowLabel ? <span>{label}</span> : null}
    </span>
  );
}
