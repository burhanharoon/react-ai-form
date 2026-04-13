import { describe, expect, it } from "vitest";
import { CORE_VERSION } from "./index";

describe("@react-ai-form/core", () => {
  it("exports CORE_VERSION", () => {
    expect(CORE_VERSION).toBe("0.0.1");
  });
});
