import { describe, expect, it } from "vitest";
import { z } from "zod";
import { extractFieldMeta, filterSchemaByPrivacy, schemaToSystemPrompt } from "./schema";

describe("extractFieldMeta", () => {
  it("extracts metadata from a flat schema with basic types", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      active: z.boolean(),
    });

    const fields = extractFieldMeta(schema);

    expect(fields).toHaveLength(3);
    expect(fields[0]).toMatchObject({
      name: "name",
      path: "name",
      type: "string",
      required: true,
    });
    expect(fields[1]).toMatchObject({
      name: "age",
      path: "age",
      type: "number",
      required: true,
    });
    expect(fields[2]).toMatchObject({
      name: "active",
      path: "active",
      type: "boolean",
      required: true,
    });
  });

  it("marks optional, nullable, and default fields as not required", () => {
    const schema = z.object({
      optionalField: z.string().optional(),
      nullableField: z.number().nullable(),
      defaultField: z.string().default("hello"),
    });

    const fields = extractFieldMeta(schema);

    expect(fields).toHaveLength(3);
    for (const field of fields) {
      expect(field.required).toBe(false);
    }
  });

  it("captures descriptions from .describe()", () => {
    const schema = z.object({
      name: z.string().describe("User's full name"),
      email: z.string().describe("Contact email address"),
    });

    const fields = extractFieldMeta(schema);

    expect(fields[0]?.description).toBe("User's full name");
    expect(fields[1]?.description).toBe("Contact email address");
  });

  it("defaults description to empty string when not set", () => {
    const schema = z.object({
      name: z.string(),
    });

    const fields = extractFieldMeta(schema);
    expect(fields[0]?.description).toBe("");
  });

  it("extracts enum values", () => {
    const schema = z.object({
      role: z.enum(["admin", "editor", "viewer"]),
    });

    const fields = extractFieldMeta(schema);

    expect(fields[0]).toMatchObject({
      type: "enum",
      enumValues: ["admin", "editor", "viewer"],
    });
  });

  it("extracts string constraints (min, max, email)", () => {
    const schema = z.object({
      email: z.string().min(5).max(255).email(),
    });

    const fields = extractFieldMeta(schema);

    expect(fields[0]?.constraints).toEqual({
      min: 5,
      max: 255,
      format: "email",
    });
  });

  it("extracts regex constraint", () => {
    const schema = z.object({
      code: z.string().regex(/^[A-Z]{3}$/),
    });

    const fields = extractFieldMeta(schema);

    expect(fields[0]?.constraints?.pattern).toBe("^[A-Z]{3}$");
  });

  it("extracts number constraints (min, max)", () => {
    const schema = z.object({
      score: z.number().min(0).max(100),
    });

    const fields = extractFieldMeta(schema);

    expect(fields[0]?.constraints).toEqual({
      min: 0,
      max: 100,
    });
  });

  it("extracts nested object fields with dot-notation paths", () => {
    const schema = z.object({
      address: z.object({
        street: z.string(),
        city: z.string(),
      }),
    });

    const fields = extractFieldMeta(schema);

    expect(fields).toHaveLength(3);
    expect(fields[0]).toMatchObject({
      name: "address",
      path: "address",
      type: "object",
    });
    expect(fields[1]).toMatchObject({
      name: "street",
      path: "address.street",
      type: "string",
    });
    expect(fields[2]).toMatchObject({
      name: "city",
      path: "address.city",
      type: "string",
    });
  });

  it("handles deeply nested objects (3 levels)", () => {
    const schema = z.object({
      a: z.object({
        b: z.object({
          c: z.string(),
        }),
      }),
    });

    const fields = extractFieldMeta(schema);

    const paths = fields.map((f) => f.path);
    expect(paths).toContain("a");
    expect(paths).toContain("a.b");
    expect(paths).toContain("a.b.c");
  });

  it("identifies array fields", () => {
    const schema = z.object({
      tags: z.array(z.string()),
    });

    const fields = extractFieldMeta(schema);

    expect(fields[0]).toMatchObject({
      name: "tags",
      type: "array",
    });
  });

  it("handles optional nested objects", () => {
    const schema = z.object({
      profile: z
        .object({
          bio: z.string(),
        })
        .optional(),
    });

    const fields = extractFieldMeta(schema);

    expect(fields[0]).toMatchObject({
      name: "profile",
      path: "profile",
      type: "object",
      required: false,
    });
    expect(fields[1]).toMatchObject({
      name: "bio",
      path: "profile.bio",
      type: "string",
    });
  });

  it("unwraps ZodEffects (.refine) to detect inner type", () => {
    const schema = z.object({
      age: z.number().refine((n) => n >= 18, "Must be at least 18"),
    });

    const fields = extractFieldMeta(schema);

    expect(fields[0]).toMatchObject({
      name: "age",
      type: "number",
      required: true,
    });
  });

  it("handles date fields", () => {
    const schema = z.object({
      birthDate: z.date(),
    });

    const fields = extractFieldMeta(schema);

    expect(fields[0]).toMatchObject({
      name: "birthDate",
      type: "date",
    });
  });
});

describe("schemaToSystemPrompt", () => {
  const basicSchema = z.object({
    name: z.string().describe("User's full name"),
    email: z.string().email().describe("Email address"),
    age: z.number().min(0).max(150).optional(),
  });

  it("includes field names and types", () => {
    const prompt = schemaToSystemPrompt(basicSchema);

    expect(prompt).toContain('"name"');
    expect(prompt).toContain('"email"');
    expect(prompt).toContain('"age"');
    expect(prompt).toContain("string");
    expect(prompt).toContain("number");
  });

  it("includes valid JSON instruction", () => {
    const prompt = schemaToSystemPrompt(basicSchema);

    expect(prompt).toContain("valid JSON");
  });

  it("includes context when provided", () => {
    const prompt = schemaToSystemPrompt(basicSchema, {
      context: "The user is John Doe, age 30",
    });

    expect(prompt).toContain("The user is John Doe, age 30");
  });

  it("does not leak undefined when context is omitted", () => {
    const prompt = schemaToSystemPrompt(basicSchema);

    expect(prompt).not.toContain("undefined");
  });

  it("lists enum allowed values", () => {
    const schema = z.object({
      status: z.enum(["draft", "published", "archived"]),
    });

    const prompt = schemaToSystemPrompt(schema);

    expect(prompt).toContain("draft");
    expect(prompt).toContain("published");
    expect(prompt).toContain("archived");
    expect(prompt).toContain("Allowed values");
  });

  it("includes constraints in the prompt", () => {
    const prompt = schemaToSystemPrompt(basicSchema);

    expect(prompt).toContain("email");
    expect(prompt).toContain("0");
    expect(prompt).toContain("150");
  });

  it("instructs the LLM to use null for unknown fields", () => {
    const prompt = schemaToSystemPrompt(basicSchema);

    expect(prompt).toContain("null");
  });

  it("instructs the LLM not to hallucinate", () => {
    const prompt = schemaToSystemPrompt(basicSchema);

    expect(prompt).toContain("hallucinate");
  });

  it("marks required and optional fields", () => {
    const prompt = schemaToSystemPrompt(basicSchema);

    expect(prompt).toContain("required");
    expect(prompt).toContain("optional");
  });
});

describe("filterSchemaByPrivacy", () => {
  it("removes high-sensitivity fields", () => {
    const schema = z.object({
      name: z.string(),
      ssn: z.string(),
      email: z.string(),
    });

    const filtered = filterSchemaByPrivacy(schema, {
      fields: {
        ssn: { aiEnabled: false, sensitivity: "high" },
      },
    });

    const keys = Object.keys(filtered.shape);
    expect(keys).toContain("name");
    expect(keys).toContain("email");
    expect(keys).not.toContain("ssn");
  });

  it("keeps non-sensitive fields", () => {
    const schema = z.object({
      name: z.string(),
      email: z.string(),
    });

    const filtered = filterSchemaByPrivacy(schema, {
      fields: {
        name: { aiEnabled: true, sensitivity: "none" },
        email: { aiEnabled: true, sensitivity: "low" },
      },
    });

    const keys = Object.keys(filtered.shape);
    expect(keys).toHaveLength(2);
  });

  it("filters nested object fields by dot-path", () => {
    const schema = z.object({
      address: z.object({
        street: z.string(),
        zipCode: z.string(),
      }),
    });

    const filtered = filterSchemaByPrivacy(schema, {
      fields: {
        "address.zipCode": { aiEnabled: false, sensitivity: "high" },
      },
    });

    const addressShape = (filtered.shape["address"] as z.ZodObject<z.ZodRawShape>).shape;
    expect(Object.keys(addressShape)).toContain("street");
    expect(Object.keys(addressShape)).not.toContain("zipCode");
  });

  it("removes parent when all children are high-sensitivity", () => {
    const schema = z.object({
      name: z.string(),
      secret: z.object({
        key: z.string(),
        token: z.string(),
      }),
    });

    const filtered = filterSchemaByPrivacy(schema, {
      fields: {
        "secret.key": { aiEnabled: false, sensitivity: "high" },
        "secret.token": { aiEnabled: false, sensitivity: "high" },
      },
    });

    const keys = Object.keys(filtered.shape);
    expect(keys).toContain("name");
    expect(keys).not.toContain("secret");
  });

  it("uses defaultFieldConfig for sensitivity", () => {
    const schema = z.object({
      name: z.string(),
      ssn: z.string(),
    });

    const filtered = filterSchemaByPrivacy(schema, {
      defaultFieldConfig: { aiEnabled: true, sensitivity: "high" },
      fields: {
        name: { aiEnabled: true, sensitivity: "none" },
      },
    });

    const keys = Object.keys(filtered.shape);
    expect(keys).toContain("name");
    expect(keys).not.toContain("ssn");
  });

  it("returns full schema when config has no fields", () => {
    const schema = z.object({
      name: z.string(),
      email: z.string(),
    });

    const filtered = filterSchemaByPrivacy(schema, {});

    expect(Object.keys(filtered.shape)).toHaveLength(2);
  });

  it("produces a valid Zod schema that can parse data", () => {
    const schema = z.object({
      name: z.string(),
      ssn: z.string(),
    });

    const filtered = filterSchemaByPrivacy(schema, {
      fields: {
        ssn: { aiEnabled: false, sensitivity: "high" },
      },
    });

    const result = filtered.safeParse({ name: "Alice" });
    expect(result.success).toBe(true);
  });

  it("preserves optional wrapper on nested objects", () => {
    const schema = z.object({
      profile: z
        .object({
          bio: z.string(),
          ssn: z.string(),
        })
        .optional(),
    });

    const filtered = filterSchemaByPrivacy(schema, {
      fields: {
        "profile.ssn": { aiEnabled: false, sensitivity: "high" },
      },
    });

    // The filtered schema should still accept undefined for profile
    const result = filtered.safeParse({});
    expect(result.success).toBe(true);
  });
});
