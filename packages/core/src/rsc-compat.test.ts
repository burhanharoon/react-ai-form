import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  CORE_VERSION,
  classifyFieldSensitivity,
  createAICache,
  createCacheKey,
  createFieldRouter,
  diffPartialObjects,
  extractFieldMeta,
  filterSchemaByPrivacy,
  getFieldPrivacyConfig,
  isFieldAIEnabled,
  redactPII,
  rehydratePII,
  sanitizeFormDataForAI,
  schemaToSystemPrompt,
} from "./index";

/**
 * Contract: nothing exported from @react-ai-form/core touches React, the
 * DOM, window, document, or localStorage. Every symbol must be callable
 * inside an RSC / server-only module graph with zero setup.
 *
 * This is not a Next.js runtime test — it's a module-graph contract.
 * If any transitive import pulls in a client-only API, Vitest will
 * fail to load this file or the invocations will throw.
 */
describe("@react-ai-form/core — RSC / server compatibility", () => {
  it("exposes a CORE_VERSION string", () => {
    expect(typeof CORE_VERSION).toBe("string");
  });

  it("redactPII returns placeholders without touching the DOM", () => {
    const { redacted, mapping } = redactPII("Reach me at jane@example.com or +1 555 0134.");
    expect(redacted).not.toContain("jane@example.com");
    expect(mapping.size).toBeGreaterThan(0);
  });

  it("rehydratePII round-trips a redacted string", () => {
    const original = "email: jane@example.com";
    const { redacted, mapping } = redactPII(original);
    expect(rehydratePII(redacted, mapping)).toBe(original);
  });

  it("extractFieldMeta + schemaToSystemPrompt work on a Zod schema", () => {
    const schema = z.object({
      name: z.string().describe("Full name"),
      age: z.number().int().min(0),
    });
    const meta = extractFieldMeta(schema);
    expect(meta.length).toBeGreaterThan(0);
    expect(typeof schemaToSystemPrompt(schema)).toBe("string");
  });

  it("filterSchemaByPrivacy strips high-sensitivity fields", () => {
    const schema = z.object({
      email: z.string(),
      ssn: z.string(),
    });
    const filtered = filterSchemaByPrivacy(schema, {
      fields: { ssn: { aiEnabled: false, sensitivity: "high" } },
    });
    expect(Object.keys(filtered.shape)).toEqual(["email"]);
  });

  it("privacy helpers return plain values, not React elements", () => {
    expect(getFieldPrivacyConfig("email", {}).aiEnabled).toBe(true);
    expect(isFieldAIEnabled("email", {})).toBe(true);
    expect(
      classifyFieldSensitivity({
        name: "ssn",
        path: "ssn",
        type: "string",
        description: "Social security number",
        required: true,
      }),
    ).toBe("high");
    const sanitized = sanitizeFormDataForAI(
      { email: "a@b.com", ssn: "123-45-6789" },
      z.object({ email: z.string(), ssn: z.string() }),
      { fields: { ssn: { aiEnabled: false, sensitivity: "high" } } },
    );
    expect(sanitized.sanitized).not.toHaveProperty("ssn");
  });

  it("createAICache + createCacheKey work without a browser", () => {
    const cache = createAICache();
    const key = createCacheKey({ schema: z.object({}), context: "t" });
    cache.set(key, "x");
    expect(cache.get(key)).toBe("x");
  });

  it("createFieldRouter + diffPartialObjects are pure", () => {
    const router = createFieldRouter(z.object({ name: z.string() }));
    expect(typeof router.update).toBe("function");
    expect(diffPartialObjects({}, { name: "Jane" })).toHaveLength(1);
  });
});
