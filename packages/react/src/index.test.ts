import { describe, expect, it } from "vitest";
import { CORE_VERSION, REACT_VERSION } from "./index";

describe("@react-ai-form/react", () => {
  it("exports REACT_VERSION", () => {
    expect(REACT_VERSION).toBe("0.0.1");
  });

  it("re-exports from @react-ai-form/core", () => {
    expect(CORE_VERSION).toBe("0.0.1");
  });
});
