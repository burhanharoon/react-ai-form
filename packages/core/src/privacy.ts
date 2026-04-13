import type { ZodObject, ZodRawShape } from "zod";
import { extractFieldMeta } from "./schema";
import type { AIFieldConfig, AIFieldMeta, AIFormConfig } from "./types";

// ── PII regex patterns (ordered to avoid overlap: SSN before Phone) ─

const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;
const CC_PATTERN = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{1,4}\b/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
const IP_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

// ── Sensitivity classification keywords ─────────────────────────────

const HIGH_KEYWORDS = [
  "password",
  "ssn",
  "social security",
  "credit card",
  "cvv",
  "secret",
  "token",
  "api key",
  "apikey",
];

const LOW_KEYWORDS = ["email", "phone", "address", "birth", "name", "salary", "income"];

// ── Private helpers ─────────────────────────────────────────────────

function generateSuffix(): string {
  return Math.random().toString(36).substring(2, 6);
}

function replaceWithPlaceholders(
  text: string,
  pattern: RegExp,
  label: string,
  mapping: Map<string, string>,
): string {
  return text.replace(pattern, (match) => {
    const placeholder = `[${label}_${generateSuffix()}]`;
    mapping.set(placeholder, match);
    return placeholder;
  });
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Returns the merged AI configuration for a specific field, combining
 * the default config with any field-specific overrides.
 * Fields with `sensitivity: "high"` automatically have `aiEnabled` forced to `false`.
 *
 * @param fieldPath - Dot-notation path of the field.
 * @param formConfig - The form-level AI configuration.
 * @returns The resolved field configuration.
 */
export function getFieldPrivacyConfig(fieldPath: string, formConfig: AIFormConfig): AIFieldConfig {
  const base: AIFieldConfig = {
    aiEnabled: true,
    sensitivity: "none",
  };

  const defaults = formConfig.defaultFieldConfig;
  if (defaults?.aiEnabled !== undefined) base.aiEnabled = defaults.aiEnabled;
  if (defaults?.sensitivity !== undefined) base.sensitivity = defaults.sensitivity;
  if (defaults?.suggestionMode !== undefined) base.suggestionMode = defaults.suggestionMode;
  if (defaults?.customPrompt !== undefined) base.customPrompt = defaults.customPrompt;

  const fieldOverride = formConfig.fields?.[fieldPath];
  if (fieldOverride?.aiEnabled !== undefined) base.aiEnabled = fieldOverride.aiEnabled;
  if (fieldOverride?.sensitivity !== undefined) base.sensitivity = fieldOverride.sensitivity;
  if (fieldOverride?.suggestionMode !== undefined)
    base.suggestionMode = fieldOverride.suggestionMode;
  if (fieldOverride?.customPrompt !== undefined) base.customPrompt = fieldOverride.customPrompt;

  if (base.sensitivity === "high") {
    base.aiEnabled = false;
  }

  return base;
}

/**
 * Quick check whether AI is allowed to process a given field.
 *
 * @param fieldPath - Dot-notation path of the field.
 * @param formConfig - The form-level AI configuration.
 * @returns `true` if AI may read/write the field.
 */
export function isFieldAIEnabled(fieldPath: string, formConfig: AIFormConfig): boolean {
  return getFieldPrivacyConfig(fieldPath, formConfig).aiEnabled;
}

/**
 * Detects and replaces common PII patterns in text with reversible placeholders.
 * Supports emails, phone numbers, SSNs, credit card numbers, and IP addresses.
 *
 * @param text - The input text to scan for PII.
 * @returns The redacted text and a mapping from placeholders to original values.
 */
export function redactPII(text: string): { redacted: string; mapping: Map<string, string> } {
  const mapping = new Map<string, string>();
  let result = text;

  // Order matters: SSN before Phone to prevent overlap
  result = replaceWithPlaceholders(result, SSN_PATTERN, "SSN", mapping);
  result = replaceWithPlaceholders(result, CC_PATTERN, "CC", mapping);
  result = replaceWithPlaceholders(result, EMAIL_PATTERN, "EMAIL", mapping);
  result = replaceWithPlaceholders(result, PHONE_PATTERN, "PHONE", mapping);
  result = replaceWithPlaceholders(result, IP_PATTERN, "IP", mapping);

  return { redacted: result, mapping };
}

/**
 * Restores original PII values from a previously redacted text
 * using the placeholder-to-original mapping.
 *
 * @param text - The redacted text containing placeholders.
 * @param mapping - The mapping returned by {@link redactPII}.
 * @returns The original text with all placeholders replaced.
 */
export function rehydratePII(text: string, mapping: Map<string, string>): string {
  let result = text;
  for (const [placeholder, original] of mapping) {
    result = result.replace(placeholder, original);
  }
  return result;
}

/**
 * Auto-detects a field's sensitivity level from its name and description
 * using keyword matching. Returns `"high"` for fields like passwords and SSNs,
 * `"low"` for personal information like emails and addresses, and `"none"` otherwise.
 *
 * @param fieldMeta - Metadata for the field to classify.
 * @returns The inferred sensitivity level.
 */
export function classifyFieldSensitivity(fieldMeta: AIFieldMeta): "none" | "low" | "high" {
  const text = `${fieldMeta.name} ${fieldMeta.description}`.toLowerCase();

  for (const keyword of HIGH_KEYWORDS) {
    if (text.includes(keyword)) return "high";
  }

  for (const keyword of LOW_KEYWORDS) {
    if (text.includes(keyword)) return "low";
  }

  return "none";
}

/**
 * One-stop function that sanitizes form data before sending it to an LLM.
 * High-sensitivity fields are removed entirely, low-sensitivity string fields
 * have their PII redacted, and all other fields pass through unchanged.
 *
 * @param data - The raw form data.
 * @param schema - The Zod schema describing the form.
 * @param config - The AI form configuration with privacy settings.
 * @returns Sanitized data, list of redacted field paths, and a PII mapping for rehydration.
 */
export function sanitizeFormDataForAI(
  data: Record<string, unknown>,
  schema: ZodObject<ZodRawShape>,
  config: AIFormConfig,
): { sanitized: Record<string, unknown>; redactedFields: string[]; mapping: Map<string, string> } {
  const fields = extractFieldMeta(schema);
  const masterMapping = new Map<string, string>();
  const redactedFields: string[] = [];
  const sanitized: Record<string, unknown> = {};

  for (const field of fields) {
    // Skip object-type entries (their children are processed individually)
    if (field.type === "object") continue;

    const fieldConfig = config.fields?.[field.path];
    const sensitivity =
      fieldConfig?.sensitivity ?? config.defaultFieldConfig?.sensitivity ?? "none";
    const value = getNestedValue(data, field.path);

    if (value === undefined) continue;

    if (sensitivity === "high") {
      redactedFields.push(field.path);
      continue;
    }

    if (sensitivity === "low" && typeof value === "string") {
      const { redacted, mapping } = redactPII(value);
      for (const [placeholder, original] of mapping) {
        masterMapping.set(placeholder, original);
      }
      setNestedValue(sanitized, field.path, redacted);
    } else {
      setNestedValue(sanitized, field.path, value);
    }
  }

  return { sanitized, redactedFields, mapping: masterMapping };
}

// ── Nested value helpers ────────────────────────────────────────────

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part === undefined) continue;
    if (!(part in current) || typeof current[part] !== "object" || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  const lastPart = parts[parts.length - 1];
  if (lastPart === undefined) return;
  current[lastPart] = value;
}
