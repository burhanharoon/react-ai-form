import { describe, expect, it } from "vitest";
import { REACT_VERSION, RHF_ADAPTER_VERSION } from "./index";

describe("@react-ai-form/react-hook-form", () => {
  it("exports RHF_ADAPTER_VERSION", () => {
    expect(RHF_ADAPTER_VERSION).toBe("0.0.1");
  });

  it("re-exports from @react-ai-form/react", () => {
    expect(REACT_VERSION).toBe("0.0.1");
  });
});
