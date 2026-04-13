import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  classifyFieldSensitivity,
  getFieldPrivacyConfig,
  isFieldAIEnabled,
  redactPII,
  rehydratePII,
  sanitizeFormDataForAI,
} from "./privacy";
import type { AIFieldMeta } from "./types";

describe("getFieldPrivacyConfig", () => {
  it("returns defaults when no config overrides exist", () => {
    const config = getFieldPrivacyConfig("name", {});
    expect(config.aiEnabled).toBe(true);
    expect(config.sensitivity).toBe("none");
  });

  it("merges defaultFieldConfig", () => {
    const config = getFieldPrivacyConfig("name", {
      defaultFieldConfig: { aiEnabled: true, sensitivity: "low" },
    });
    expect(config.sensitivity).toBe("low");
  });

  it("field-specific overrides take precedence over defaults", () => {
    const config = getFieldPrivacyConfig("ssn", {
      defaultFieldConfig: { aiEnabled: true, sensitivity: "low" },
      fields: { ssn: { aiEnabled: false, sensitivity: "high" } },
    });
    expect(config.sensitivity).toBe("high");
    expect(config.aiEnabled).toBe(false);
  });

  it("forces aiEnabled to false when sensitivity is high", () => {
    const config = getFieldPrivacyConfig("ssn", {
      fields: { ssn: { aiEnabled: true, sensitivity: "high" } },
    });
    expect(config.aiEnabled).toBe(false);
  });
});

describe("isFieldAIEnabled", () => {
  it("returns true for unconfigured fields", () => {
    expect(isFieldAIEnabled("name", {})).toBe(true);
  });

  it("returns false for high-sensitivity fields", () => {
    expect(
      isFieldAIEnabled("ssn", {
        fields: { ssn: { aiEnabled: false, sensitivity: "high" } },
      }),
    ).toBe(false);
  });
});

describe("redactPII", () => {
  it("redacts email addresses", () => {
    const { redacted, mapping } = redactPII("Contact john@example.com for info");
    expect(redacted).not.toContain("john@example.com");
    expect(redacted).toMatch(/\[EMAIL_[a-z0-9]{4}\]/);
    expect(mapping.size).toBe(1);
  });

  it("redacts complex email addresses", () => {
    const { redacted } = redactPII("Email: first.last+tag@sub.domain.co.uk");
    expect(redacted).not.toContain("first.last+tag@sub.domain.co.uk");
  });

  it("redacts SSN patterns", () => {
    const { redacted, mapping } = redactPII("SSN: 123-45-6789");
    expect(redacted).not.toContain("123-45-6789");
    expect(redacted).toMatch(/\[SSN_[a-z0-9]{4}\]/);
    expect(mapping.size).toBe(1);
  });

  it("redacts credit card numbers", () => {
    const { redacted } = redactPII("Card: 4111-1111-1111-1111");
    expect(redacted).not.toContain("4111-1111-1111-1111");
    expect(redacted).toMatch(/\[CC_[a-z0-9]{4}\]/);
  });

  it("redacts credit card numbers with spaces", () => {
    const { redacted } = redactPII("Card: 5500 0000 0000 0004");
    expect(redacted).not.toContain("5500 0000 0000 0004");
  });

  it("redacts IP addresses", () => {
    const { redacted } = redactPII("Server at 192.168.1.1");
    expect(redacted).not.toContain("192.168.1.1");
    expect(redacted).toMatch(/\[IP_[a-z0-9]{4}\]/);
  });

  it("redacts phone numbers", () => {
    const { redacted } = redactPII("Call 555-123-4567");
    expect(redacted).not.toContain("555-123-4567");
    expect(redacted).toMatch(/\[PHONE_[a-z0-9]{4}\]/);
  });

  it("redacts international phone numbers", () => {
    const { redacted } = redactPII("Call +1-555-123-4567");
    expect(redacted).not.toContain("+1-555-123-4567");
  });

  it("returns unchanged text when no PII found", () => {
    const { redacted, mapping } = redactPII("Hello world, nice day");
    expect(redacted).toBe("Hello world, nice day");
    expect(mapping.size).toBe(0);
  });

  it("handles text with multiple PII types", () => {
    const { redacted, mapping } = redactPII("John john@acme.com SSN: 123-45-6789 IP: 10.0.0.1");
    expect(redacted).not.toContain("john@acme.com");
    expect(redacted).not.toContain("123-45-6789");
    expect(redacted).not.toContain("10.0.0.1");
    expect(mapping.size).toBe(3);
  });

  it("generates unique placeholders for multiple instances", () => {
    const { redacted } = redactPII("a@b.com and c@d.com");
    const matches = redacted.match(/\[EMAIL_[a-z0-9]{4}\]/g);
    expect(matches).toHaveLength(2);
    expect(matches?.[0]).not.toBe(matches?.[1]);
  });

  it("handles empty string", () => {
    const { redacted, mapping } = redactPII("");
    expect(redacted).toBe("");
    expect(mapping.size).toBe(0);
  });
});

describe("rehydratePII", () => {
  it("restores original values from redacted text", () => {
    const original = "Contact john@acme.com about SSN 123-45-6789";
    const { redacted, mapping } = redactPII(original);
    const restored = rehydratePII(redacted, mapping);
    expect(restored).toBe(original);
  });

  it("returns text unchanged with empty mapping", () => {
    const text = "No PII here";
    expect(rehydratePII(text, new Map())).toBe(text);
  });

  it("roundtrips complex multi-PII text", () => {
    const original = "Email: test@example.com, Phone: 555-123-4567, IP: 192.168.0.1";
    const { redacted, mapping } = redactPII(original);
    expect(rehydratePII(redacted, mapping)).toBe(original);
  });
});

describe("classifyFieldSensitivity", () => {
  function makeMeta(name: string, description = ""): AIFieldMeta {
    return { name, path: name, type: "string", description, required: true };
  }

  it("classifies password fields as high", () => {
    expect(classifyFieldSensitivity(makeMeta("password"))).toBe("high");
  });

  it("classifies ssn fields as high", () => {
    expect(classifyFieldSensitivity(makeMeta("ssn"))).toBe("high");
  });

  it("classifies fields with 'credit card' in description as high", () => {
    expect(classifyFieldSensitivity(makeMeta("cardNumber", "Credit card number"))).toBe("high");
  });

  it("classifies apiKey fields as high", () => {
    expect(classifyFieldSensitivity(makeMeta("apiKey"))).toBe("high");
  });

  it("classifies token fields as high", () => {
    expect(classifyFieldSensitivity(makeMeta("refreshToken"))).toBe("high");
  });

  it("classifies email fields as low", () => {
    expect(classifyFieldSensitivity(makeMeta("email"))).toBe("low");
  });

  it("classifies phone fields as low", () => {
    expect(classifyFieldSensitivity(makeMeta("phoneNumber"))).toBe("low");
  });

  it("classifies address fields as low", () => {
    expect(classifyFieldSensitivity(makeMeta("address"))).toBe("low");
  });

  it("classifies birthDate fields as low", () => {
    expect(classifyFieldSensitivity(makeMeta("birthDate"))).toBe("low");
  });

  it("classifies company as none", () => {
    expect(classifyFieldSensitivity(makeMeta("company"))).toBe("none");
  });

  it("classifies role as none", () => {
    expect(classifyFieldSensitivity(makeMeta("role"))).toBe("none");
  });

  it("uses description for classification", () => {
    expect(classifyFieldSensitivity(makeMeta("field1", "User's social security number"))).toBe(
      "high",
    );
  });
});

describe("sanitizeFormDataForAI", () => {
  const schema = z.object({
    name: z.string(),
    email: z.string(),
    ssn: z.string(),
    company: z.string(),
  });

  it("removes high-sensitivity fields and redacts low-sensitivity fields", () => {
    const { sanitized, redactedFields, mapping } = sanitizeFormDataForAI(
      { name: "John", email: "john@acme.com", ssn: "123-45-6789", company: "Acme" },
      schema,
      {
        fields: {
          ssn: { aiEnabled: false, sensitivity: "high" },
          email: { aiEnabled: true, sensitivity: "low" },
        },
      },
    );

    expect(sanitized).not.toHaveProperty("ssn");
    expect(redactedFields).toContain("ssn");
    // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket notation
    expect((sanitized as Record<string, string>)["email"]).toMatch(/\[EMAIL_/);
    // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket notation
    expect((sanitized as Record<string, string>)["name"]).toBe("John");
    // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket notation
    expect((sanitized as Record<string, string>)["company"]).toBe("Acme");
    expect(mapping.size).toBeGreaterThan(0);
  });

  it("returns full data when no fields are sensitive", () => {
    const { sanitized, redactedFields } = sanitizeFormDataForAI(
      { name: "John", email: "test", ssn: "none", company: "Acme" },
      schema,
      {},
    );

    expect(Object.keys(sanitized)).toHaveLength(4);
    expect(redactedFields).toHaveLength(0);
  });

  it("handles nested object schemas", () => {
    const nestedSchema = z.object({
      profile: z.object({
        name: z.string(),
        ssn: z.string(),
      }),
    });

    const { sanitized, redactedFields } = sanitizeFormDataForAI(
      { profile: { name: "John", ssn: "123-45-6789" } },
      nestedSchema,
      {
        fields: { "profile.ssn": { aiEnabled: false, sensitivity: "high" } },
      },
    );

    expect(redactedFields).toContain("profile.ssn");
    // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket notation
    const profile = (sanitized as Record<string, Record<string, unknown>>)["profile"];
    // biome-ignore lint/complexity/useLiteralKeys: index signature requires bracket notation
    expect(profile?.["name"]).toBe("John");
    expect(profile).not.toHaveProperty("ssn");
  });
});
