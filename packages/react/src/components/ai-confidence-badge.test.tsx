// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AIConfidenceBadge } from "./ai-confidence-badge";

describe("AIConfidenceBadge", () => {
  it("returns null for 'empty' status", () => {
    const { container } = render(<AIConfidenceBadge status="empty" />);
    expect(container.innerHTML).toBe("");
  });

  it("renders sparkle icon and 'AI' label for ai-filled status with high confidence", () => {
    render(<AIConfidenceBadge status="ai-filled" confidence="high" />);
    const badge = screen.getByRole("status");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("AI");
    expect(badge.querySelector("svg")).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-ai-confidence", "ai-filled");
    expect(badge).toHaveAttribute("data-ai-confidence-level", "high");
  });

  it("renders sparkle icon and 'AI' label for ai-filled status with medium confidence", () => {
    render(<AIConfidenceBadge status="ai-filled" confidence="medium" />);
    const badge = screen.getByRole("status");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("AI");
    expect(badge).toHaveAttribute("data-ai-confidence-level", "medium");
  });

  it("renders sparkle icon and 'AI (review)' label for ai-filled status with low confidence", () => {
    render(<AIConfidenceBadge status="ai-filled" confidence="low" />);
    const badge = screen.getByRole("status");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("AI (review)");
    expect(badge).toHaveAttribute("data-ai-confidence-level", "low");
  });

  it("renders pencil icon and 'Edited' label for user-modified status", () => {
    render(<AIConfidenceBadge status="user-modified" />);
    const badge = screen.getByRole("status");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent("Edited");
    expect(badge.querySelector("svg")).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-ai-confidence", "user-modified");
  });

  it("has role='status' attribute", () => {
    render(<AIConfidenceBadge status="ai-filled" confidence="high" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("has descriptive aria-label for each status", () => {
    const { unmount: unmount1 } = render(
      <AIConfidenceBadge status="ai-filled" confidence="high" />,
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "This field was filled by AI with high confidence",
    );
    unmount1();

    const { unmount: unmount2 } = render(
      <AIConfidenceBadge status="ai-filled" confidence="medium" />,
    );
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "This field was filled by AI with medium confidence",
    );
    unmount2();

    const { unmount: unmount3 } = render(<AIConfidenceBadge status="ai-filled" confidence="low" />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "This field was filled by AI and may need review",
    );
    unmount3();

    render(<AIConfidenceBadge status="user-modified" />);
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "This field was edited after AI fill",
    );
  });

  it("hides text label when showLabel is false but keeps icon", () => {
    render(<AIConfidenceBadge status="ai-filled" confidence="high" showLabel={false} />);
    const badge = screen.getByRole("status");
    expect(badge.querySelector("svg")).toBeInTheDocument();
    expect(badge).not.toHaveTextContent("AI");
  });

  it("defaults confidence to high when not specified for ai-filled status", () => {
    render(<AIConfidenceBadge status="ai-filled" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveAttribute("data-ai-confidence-level", "high");
    expect(badge).toHaveAttribute("aria-label", "This field was filled by AI with high confidence");
  });

  it("applies className prop to the container", () => {
    render(<AIConfidenceBadge status="ai-filled" confidence="high" className="custom-class" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveClass("custom-class");
  });
});
