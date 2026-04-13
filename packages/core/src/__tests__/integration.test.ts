import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createAICache,
  createCacheKey,
  createFieldRouter,
  extractFieldMeta,
  filterSchemaByPrivacy,
  redactPII,
  rehydratePII,
  schemaToSystemPrompt,
} from "../index";
import type { AIFieldUpdate, AIFormConfig } from "../types";

describe("Integration: Full pipeline — Fill a contact form", () => {
  const schema = z.object({
    name: z.string().describe("Full name"),
    email: z.string().email().describe("Email address"),
    company: z.string().describe("Company name"),
    role: z.string().describe("Job role"),
    ssn: z.string().describe("Social security number"),
  });

  const config: AIFormConfig = {
    fields: {
      ssn: { aiEnabled: false, sensitivity: "high" },
    },
  };

  it("filterSchemaByPrivacy removes SSN field", () => {
    const filtered = filterSchemaByPrivacy(schema, config);
    const keys = Object.keys(filtered.shape);

    expect(keys).toContain("name");
    expect(keys).toContain("email");
    expect(keys).toContain("company");
    expect(keys).toContain("role");
    expect(keys).not.toContain("ssn");
  });

  it("schemaToSystemPrompt on filtered schema excludes SSN", () => {
    const filtered = filterSchemaByPrivacy(schema, config);
    const prompt = schemaToSystemPrompt(filtered, {
      context: "The applicant is John Doe, a senior engineer at Acme Corp",
    });

    expect(prompt).toContain("name");
    expect(prompt).toContain("email");
    expect(prompt).toContain("company");
    expect(prompt).toContain("role");
    expect(prompt).not.toContain("ssn");
    expect(prompt).not.toContain("Social security");
    expect(prompt).toContain("John Doe");
    expect(prompt).toContain("valid JSON");
  });

  it("extractFieldMeta returns all 5 fields with correct types", () => {
    const fields = extractFieldMeta(schema);

    expect(fields).toHaveLength(5);
    expect(fields.find((f) => f.name === "name")?.type).toBe("string");
    expect(fields.find((f) => f.name === "email")?.type).toBe("string");
    expect(fields.find((f) => f.name === "ssn")?.description).toBe("Social security number");
  });

  it("createFieldRouter simulates streaming and fires subscriptions", () => {
    const filtered = filterSchemaByPrivacy(schema, config);
    const router = createFieldRouter(filtered);

    const allUpdates: AIFieldUpdate[] = [];
    const nameUpdates: AIFieldUpdate[] = [];
    router.subscribeAll((u) => allUpdates.push(u));
    router.subscribe("name", (u) => nameUpdates.push(u));

    // Simulate streaming partial objects
    router.update({ name: "Jo" });
    router.update({ name: "John", email: "john" });
    router.update({ name: "John", email: "john@acme.com", company: "Acme" });
    router.update({ name: "John", email: "john@acme.com", company: "Acme Corp", role: "Engineer" });

    // Name changed twice: "Jo" -> "John", then stable
    expect(nameUpdates).toHaveLength(2);

    // No duplicate events: "John" appears at t1 and stays, should not re-fire
    const nameValuesAfterFirst = nameUpdates.slice(1).map((u) => u.value);
    expect(nameValuesAfterFirst).toEqual(["John"]);

    // Complete fires isComplete for all fields
    const completeUpdates: AIFieldUpdate[] = [];
    router.subscribeAll((u) => completeUpdates.push(u));
    router.complete();

    expect(completeUpdates.length).toBeGreaterThan(0);
    for (const u of completeUpdates) {
      expect(u.isComplete).toBe(true);
    }
  });

  it("PII redaction and rehydration roundtrip", () => {
    const input = "John Doe, john@acme.com, 123-45-6789";
    const { redacted, mapping } = redactPII(input);

    expect(redacted).not.toContain("john@acme.com");
    expect(redacted).not.toContain("123-45-6789");
    expect(redacted).toMatch(/\[EMAIL_/);
    expect(redacted).toMatch(/\[SSN_/);

    const restored = rehydratePII(redacted, mapping);
    expect(restored).toBe(input);
  });

  it("cache stores and retrieves with deterministic keys", () => {
    const cache = createAICache<string>();
    const filtered = filterSchemaByPrivacy(schema, config);

    const key = createCacheKey({ schema: filtered, context: "fill contact form" });
    cache.set(key, '{"name":"John","email":"john@acme.com"}');

    expect(cache.get(key)).toBe('{"name":"John","email":"john@acme.com"}');

    // Same inputs produce the same key
    const key2 = createCacheKey({ schema: filtered, context: "fill contact form" });
    expect(key2).toBe(key);

    expect(cache.stats().hits).toBe(1);
  });
});
