import { ZodFirstPartyTypeKind, type ZodObject, type ZodRawShape, type ZodTypeAny, z } from "zod";
import type { AIFieldMeta, AIFormConfig } from "./types";

// ── Private helper types ────────────────────────────────────────────

interface UnwrappedType {
  innerType: ZodTypeAny;
  required: boolean;
}

interface CheckWithValue {
  kind: string;
  value?: number;
  regex?: RegExp;
  inclusive?: boolean;
}

// ── Private helpers ─────────────────────────────────────────────────

function unwrapType(zodType: ZodTypeAny): UnwrappedType {
  let current = zodType;
  let required = true;

  while (true) {
    const typeName = (current._def as { typeName: string }).typeName;

    if (
      typeName === ZodFirstPartyTypeKind.ZodOptional ||
      typeName === ZodFirstPartyTypeKind.ZodNullable
    ) {
      required = false;
      current = (current._def as { innerType: ZodTypeAny }).innerType;
    } else if (typeName === ZodFirstPartyTypeKind.ZodDefault) {
      required = false;
      current = (current._def as { innerType: ZodTypeAny }).innerType;
    } else if (typeName === ZodFirstPartyTypeKind.ZodEffects) {
      current = (current._def as { schema: ZodTypeAny }).schema;
    } else {
      break;
    }
  }

  return { innerType: current, required };
}

function mapZodTypeToFieldType(typeName: string): AIFieldMeta["type"] {
  switch (typeName) {
    case ZodFirstPartyTypeKind.ZodString:
      return "string";
    case ZodFirstPartyTypeKind.ZodNumber:
      return "number";
    case ZodFirstPartyTypeKind.ZodBoolean:
      return "boolean";
    case ZodFirstPartyTypeKind.ZodDate:
      return "date";
    case ZodFirstPartyTypeKind.ZodEnum:
      return "enum";
    case ZodFirstPartyTypeKind.ZodArray:
      return "array";
    case ZodFirstPartyTypeKind.ZodObject:
      return "object";
    default:
      return "string";
  }
}

function extractConstraints(
  zodType: ZodTypeAny,
  typeName: string,
): AIFieldMeta["constraints"] | undefined {
  const def = zodType._def as { checks?: ReadonlyArray<CheckWithValue> };
  const checks = def.checks ?? [];

  if (checks.length === 0) {
    return undefined;
  }

  const constraints: NonNullable<AIFieldMeta["constraints"]> = {};
  let hasConstraint = false;

  if (typeName === ZodFirstPartyTypeKind.ZodString) {
    for (const check of checks) {
      switch (check.kind) {
        case "min":
          if (check.value !== undefined) {
            constraints.min = check.value;
            hasConstraint = true;
          }
          break;
        case "max":
          if (check.value !== undefined) {
            constraints.max = check.value;
            hasConstraint = true;
          }
          break;
        case "email":
        case "url":
        case "uuid":
        case "cuid":
        case "cuid2":
        case "ulid":
        case "nanoid":
        case "datetime":
        case "ip":
          constraints.format = check.kind;
          hasConstraint = true;
          break;
        case "regex":
          if (check.regex) {
            constraints.pattern = check.regex.source;
          }
          hasConstraint = true;
          break;
      }
    }
  } else if (typeName === ZodFirstPartyTypeKind.ZodNumber) {
    for (const check of checks) {
      switch (check.kind) {
        case "min":
          if (check.value !== undefined) {
            constraints.min = check.value;
            hasConstraint = true;
          }
          break;
        case "max":
          if (check.value !== undefined) {
            constraints.max = check.value;
            hasConstraint = true;
          }
          break;
        case "int":
          constraints.format = "integer";
          hasConstraint = true;
          break;
      }
    }
  }

  return hasConstraint ? constraints : undefined;
}

function extractFieldsFromShape(
  shape: ZodRawShape,
  pathPrefix: string,
  result: AIFieldMeta[],
): void {
  for (const [fieldName, fieldType] of Object.entries(shape)) {
    const path = pathPrefix ? `${pathPrefix}.${fieldName}` : fieldName;
    const { innerType, required } = unwrapType(fieldType);
    const typeName = (innerType._def as { typeName: string }).typeName;
    const type = mapZodTypeToFieldType(typeName);
    const description = innerType.description ?? "";

    const meta: AIFieldMeta = {
      name: fieldName,
      path,
      type,
      description,
      required,
    };

    if (typeName === ZodFirstPartyTypeKind.ZodEnum) {
      meta.enumValues = (innerType._def as { values: string[] }).values;
    }

    const constraints = extractConstraints(innerType, typeName);
    if (constraints) {
      meta.constraints = constraints;
    }

    result.push(meta);

    if (typeName === ZodFirstPartyTypeKind.ZodObject) {
      const nestedShape = (innerType as ZodObject<ZodRawShape>).shape;
      extractFieldsFromShape(nestedShape, path, result);
    }
  }
}

function formatConstraints(constraints: NonNullable<AIFieldMeta["constraints"]>): string {
  const parts: string[] = [];

  if (constraints.min !== undefined && constraints.max !== undefined) {
    parts.push(`between ${constraints.min} and ${constraints.max}`);
  } else if (constraints.min !== undefined) {
    parts.push(`minimum ${constraints.min}`);
  } else if (constraints.max !== undefined) {
    parts.push(`maximum ${constraints.max}`);
  }

  if (constraints.format) {
    parts.push(`format: ${constraints.format}`);
  }

  if (constraints.pattern) {
    parts.push(`pattern: ${constraints.pattern}`);
  }

  return parts.length > 0 ? `. Constraints: ${parts.join(", ")}` : "";
}

function unwrapToObject(
  zodType: ZodTypeAny,
): { object: ZodObject<ZodRawShape>; rewrap: (inner: ZodTypeAny) => ZodTypeAny } | undefined {
  const wrappers: Array<{ kind: string; defaultValue?: () => unknown }> = [];
  let current = zodType;

  while (true) {
    const typeName = (current._def as { typeName: string }).typeName;

    if (typeName === ZodFirstPartyTypeKind.ZodOptional) {
      wrappers.push({ kind: "optional" });
      current = (current._def as { innerType: ZodTypeAny }).innerType;
    } else if (typeName === ZodFirstPartyTypeKind.ZodNullable) {
      wrappers.push({ kind: "nullable" });
      current = (current._def as { innerType: ZodTypeAny }).innerType;
    } else if (typeName === ZodFirstPartyTypeKind.ZodDefault) {
      const def = current._def as { innerType: ZodTypeAny; defaultValue: () => unknown };
      wrappers.push({ kind: "default", defaultValue: def.defaultValue });
      current = def.innerType;
    } else if (typeName === ZodFirstPartyTypeKind.ZodObject) {
      const object = current as ZodObject<ZodRawShape>;
      const rewrap = (inner: ZodTypeAny): ZodTypeAny => {
        let result = inner;
        for (let i = wrappers.length - 1; i >= 0; i--) {
          const wrapper = wrappers[i];
          if (!wrapper) continue;
          switch (wrapper.kind) {
            case "optional":
              result = result.optional();
              break;
            case "nullable":
              result = result.nullable();
              break;
            case "default":
              if (wrapper.defaultValue) {
                result = result.default(wrapper.defaultValue());
              }
              break;
          }
        }
        return result;
      };
      return { object, rewrap };
    } else {
      return undefined;
    }
  }
}

function filterShape(shape: ZodRawShape, pathPrefix: string, config: AIFormConfig): ZodRawShape {
  const newShape: ZodRawShape = {};

  for (const [key, value] of Object.entries(shape)) {
    const fieldPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    const fieldConfig = config.fields?.[fieldPath];
    const sensitivity =
      fieldConfig?.sensitivity ?? config.defaultFieldConfig?.sensitivity ?? "none";

    if (sensitivity === "high") {
      continue;
    }

    const unwrapped = unwrapToObject(value);
    if (unwrapped) {
      const filteredInnerShape = filterShape(unwrapped.object.shape, fieldPath, config);

      if (Object.keys(filteredInnerShape).length === 0) {
        continue;
      }

      newShape[key] = unwrapped.rewrap(z.object(filteredInnerShape));
    } else {
      newShape[key] = value;
    }
  }

  return newShape;
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Extracts field metadata from a Zod object schema for LLM prompt generation.
 * Recursively walks nested objects, producing dot-notation paths for each field.
 *
 * @param schema - A Zod object schema to extract metadata from.
 * @returns An array of field metadata entries, including nested fields.
 */
export function extractFieldMeta(schema: ZodObject<ZodRawShape>): AIFieldMeta[] {
  const result: AIFieldMeta[] = [];
  extractFieldsFromShape(schema.shape, "", result);
  return result;
}

/**
 * Generates an LLM system prompt from a Zod object schema.
 * The prompt instructs the model to return valid JSON matching the schema's
 * field names, types, and constraints.
 *
 * @param schema - A Zod object schema describing the form fields.
 * @param options - Optional configuration including additional context for the LLM.
 * @returns A system prompt string optimized for structured JSON output.
 */
export function schemaToSystemPrompt(
  schema: ZodObject<ZodRawShape>,
  options?: { context?: string },
): string {
  const fields = extractFieldMeta(schema);
  const lines: string[] = [];

  lines.push(
    "You are a form-filling assistant. Your task is to generate values for a form based on the provided context.",
  );
  lines.push("");

  if (options?.context) {
    lines.push(`Context: ${options.context}`);
    lines.push("");
  }

  lines.push(
    "Respond with a valid JSON object using exactly these field names. Do not include any additional fields.",
  );
  lines.push("");
  lines.push("Fields:");

  for (const field of fields) {
    if (field.type === "object") {
      continue;
    }

    const requiredLabel = field.required ? "required" : "optional";
    let line = `- "${field.path}" (${field.type}, ${requiredLabel})`;

    if (field.description) {
      line += `: ${field.description}`;
    }

    if (field.enumValues && field.enumValues.length > 0) {
      line += `. Allowed values: ${field.enumValues.join(", ")}`;
    }

    if (field.constraints) {
      line += formatConstraints(field.constraints);
    }

    lines.push(line);
  }

  lines.push("");
  lines.push("Rules:");
  lines.push("- Output ONLY valid JSON, no markdown formatting or explanation.");
  lines.push("- Use null for any field whose value cannot be determined from the context.");
  lines.push("- Do not hallucinate or invent values that are not supported by the context.");
  lines.push("- Respect all type constraints and allowed values listed above.");

  return lines.join("\n");
}

/**
 * Returns a new Zod object schema with high-sensitivity fields removed
 * based on the provided AI form configuration. Fields marked with
 * `sensitivity: "high"` will not appear in the resulting schema.
 *
 * @param schema - The original Zod object schema.
 * @param config - AI form configuration specifying field sensitivity levels.
 * @returns A filtered Zod object schema without high-sensitivity fields.
 */
export function filterSchemaByPrivacy(
  schema: ZodObject<ZodRawShape>,
  config: AIFormConfig,
): ZodObject<ZodRawShape> {
  const filteredShape = filterShape(schema.shape, "", config);
  return z.object(filteredShape);
}
