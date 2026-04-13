import { describe, expect, it } from "vitest";
import type {
  AIFieldConfig,
  AIFieldError,
  AIFieldMeta,
  AIFieldUpdate,
  AIFillResult,
  AIFormConfig,
  AIFormError,
  AIProvider,
} from "./types";

describe("Core type definitions", () => {
  it("AIFieldConfig accepts valid configurations", () => {
    const config = {
      aiEnabled: true,
      sensitivity: "none",
      suggestionMode: "ghost",
      customPrompt: "Generate a full name",
    } satisfies AIFieldConfig;

    expect(config.aiEnabled).toBe(true);
  });

  it("AIFieldConfig works with minimal required fields", () => {
    const config = {
      aiEnabled: false,
      sensitivity: "high",
    } satisfies AIFieldConfig;

    expect(config.sensitivity).toBe("high");
  });

  it("AIFormConfig accepts valid configurations", () => {
    const config = {
      fields: {
        email: { aiEnabled: true, sensitivity: "low" },
        ssn: { aiEnabled: false, sensitivity: "high" },
      },
      defaultFieldConfig: { aiEnabled: true },
      debounceMs: 500,
      maxRetries: 3,
      cacheEnabled: true,
      cacheTTL: 60000,
      onError: (_error: AIFormError) => {},
    } satisfies AIFormConfig;

    expect(config.debounceMs).toBe(500);
  });

  it("AIFieldMeta captures Zod field metadata", () => {
    const meta = {
      name: "email",
      path: "contact.email",
      type: "string",
      description: "User email address",
      required: true,
      constraints: {
        format: "email",
        max: 255,
      },
    } satisfies AIFieldMeta;

    expect(meta.type).toBe("string");
  });

  it("AIFieldMeta supports enum fields", () => {
    const meta = {
      name: "role",
      path: "role",
      type: "enum",
      description: "User role",
      required: true,
      enumValues: ["admin", "editor", "viewer"],
    } satisfies AIFieldMeta;

    expect(meta.enumValues).toHaveLength(3);
  });

  it("AIFieldUpdate represents a streaming field value", () => {
    const update = {
      fieldPath: "address.city",
      value: "San Francisco",
      previousValue: "San",
      isComplete: false,
      timestamp: Date.now(),
    } satisfies AIFieldUpdate;

    expect(update.isComplete).toBe(false);
  });

  it("AIFillResult summarizes a fill operation", () => {
    const result = {
      success: true,
      filledFields: ["name", "email", "address.city"],
      skippedFields: ["ssn"],
      errors: [],
      duration: 1234,
      tokensUsed: 150,
    } satisfies AIFillResult;

    expect(result.filledFields).toHaveLength(3);
  });

  it("AIFieldError describes a per-field failure", () => {
    const error = {
      fieldPath: "email",
      code: "validation_failed",
      message: "Generated value is not a valid email",
    } satisfies AIFieldError;

    expect(error.code).toBe("validation_failed");
  });

  it("AIProvider wraps a language model", () => {
    const provider = {
      model: {} as AIProvider["model"],
      apiEndpoint: "https://api.example.com/stream",
    } satisfies AIProvider;

    expect(provider.apiEndpoint).toBeDefined();
  });
});
