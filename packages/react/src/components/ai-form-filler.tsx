import type { ReactNode } from "react";
import { cloneElement, forwardRef, isValidElement, useEffect, useRef, useState } from "react";
import "./ai-form-filler.css";

// ── Inline SVG icons (no icon library dependency) ──────────────────

function SparkleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0l1.5 5.5L16 8l-6.5 2.5L8 16l-1.5-5.5L0 8l6.5-2.5z" />
    </svg>
  );
}

function SpinnerIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      className="ai-form-spinner"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8.5l3.5 3.5 6.5-8" />
    </svg>
  );
}

// ── Types ──────────────────────────────────────────────────────────

/**
 * Props for the {@link AIFormFillerButton} component.
 */
export interface AIFormFillerButtonProps {
  /** Callback that triggers the AI fill (usually calls fillForm()). */
  onFill: () => void | Promise<void>;

  /** Whether the form is currently being filled. */
  isLoading?: boolean | undefined;

  /** Live progress of the fill operation. */
  progress?: { filled: number; total: number } | undefined;

  /** Disable the button. */
  disabled?: boolean | undefined;

  /** Visual variant. Defaults to `'default'`. */
  variant?: "default" | "icon" | "minimal" | undefined;

  /** Button size. Defaults to `'md'`. */
  size?: "sm" | "md" | "lg" | undefined;

  /** Override the default button label. */
  children?: ReactNode | undefined;

  /** Additional CSS class name. */
  className?: string | undefined;

  /** Headless mode: renders as child element, passing props via cloneElement. */
  asChild?: boolean | undefined;
}

// ── Component ──────────────────────────────────────────────────────

/**
 * The primary trigger button for whole-form AI fills.
 * Shows contextual states: idle → loading with progress → filled confirmation.
 *
 * @example
 * ```tsx
 * <AIFormFillerButton
 *   onFill={() => fillForm("Fill this job application")}
 *   isLoading={isFillingForm}
 *   progress={progress}
 * />
 * ```
 */
export const AIFormFillerButton = forwardRef<HTMLButtonElement, AIFormFillerButtonProps>(
  function AIFormFillerButton(
    {
      onFill,
      isLoading = false,
      progress,
      disabled,
      variant = "default",
      size = "md",
      children,
      className,
      asChild = false,
    },
    ref,
  ) {
    const [justCompleted, setJustCompleted] = useState(false);
    const wasLoadingRef = useRef(false);

    // Detect loading → not-loading transition to show "Filled!" briefly
    useEffect(() => {
      if (wasLoadingRef.current && !isLoading) {
        setJustCompleted(true);
        const timer = setTimeout(() => {
          setJustCompleted(false);
        }, 2000);
        return () => {
          clearTimeout(timer);
        };
      }
      wasLoadingRef.current = isLoading;
      return undefined;
    }, [isLoading]);

    const isDisabled = disabled || isLoading;

    // ── Headless mode ──────────────────────────────────────────────
    if (asChild && isValidElement(children)) {
      return cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        onClick: onFill,
        disabled: isDisabled,
        "aria-busy": isLoading,
      });
    }

    // ── Determine label content ────────────────────────────────────
    let icon: ReactNode = null;
    let label: ReactNode = null;

    if (justCompleted) {
      icon = variant !== "minimal" ? <CheckIcon /> : null;
      label = variant !== "icon" ? "Filled!" : null;
    } else if (isLoading) {
      icon = variant !== "minimal" ? <SpinnerIcon /> : null;
      const progressText = progress
        ? `Filling... (${progress.filled}/${progress.total})`
        : "Filling...";
      label = variant !== "icon" ? progressText : null;
    } else {
      icon = variant !== "minimal" ? <SparkleIcon /> : null;
      label = variant !== "icon" ? (children ?? "Fill with AI") : null;
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={onFill}
        disabled={isDisabled}
        className={className}
        aria-busy={isLoading}
        aria-label={variant === "icon" ? "Fill form with AI" : undefined}
        data-ai-form-filler=""
        data-ai-form-filler-size={size}
        data-ai-form-filler-variant={variant}
      >
        {icon}
        {label}
      </button>
    );
  },
);
