import { describe, expect, it } from "vitest";
import * as adapter from "./index";

describe("@react-ai-form/react-hook-form", () => {
  it("exports the useAIForm hook", () => {
    expect(typeof adapter.useAIForm).toBe("function");
  });

  it("exports the AIFormField and AITextField components", () => {
    expect(typeof adapter.AIFormField).toBe("function");
    expect(typeof adapter.AITextField).toBe("function");
  });

  it("exports the AIFormStatusProvider", () => {
    expect(typeof adapter.AIFormStatusProvider).toBe("function");
  });

  it("re-exports useAIFormFill from @react-ai-form/react", () => {
    expect(typeof adapter.useAIFormFill).toBe("function");
  });

  it("re-exports useAISuggestion and AIFieldSuggestion from @react-ai-form/react", () => {
    expect(typeof adapter.useAISuggestion).toBe("function");
    expect(typeof adapter.AIFieldSuggestion).toBe("object");
  });
});
