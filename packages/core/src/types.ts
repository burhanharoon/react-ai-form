import type { LanguageModelV1 } from "ai";

/**
 * Per-field AI configuration that controls how AI interacts with an individual form field.
 */
export interface AIFieldConfig {
  /** Whether AI can read and write this field. */
  aiEnabled: boolean;

  /** Sensitivity level for privacy filtering. Fields marked 'high' are never sent to the LLM. */
  sensitivity: "none" | "low" | "high";

  /** How AI suggestions are presented to the user. */
  suggestionMode?: "ghost" | "dropdown" | "none";

  /** Override the auto-generated prompt for this field with a custom prompt string. */
  customPrompt?: string;
}

/**
 * Top-level form AI configuration that applies to the entire form.
 */
export interface AIFormConfig {
  /** Per-field configuration overrides, keyed by field path. */
  fields?: Record<string, AIFieldConfig>;

  /** Default configuration applied to all fields unless overridden. */
  defaultFieldConfig?: Partial<AIFieldConfig>;

  /** Debounce delay in milliseconds for AI suggestion triggers. Defaults to 400. */
  debounceMs?: number;

  /** Maximum number of retries for failed AI calls. Defaults to 2. */
  maxRetries?: number;

  /** Whether to cache AI responses to reduce API costs. Defaults to true. */
  cacheEnabled?: boolean;

  /** Cache time-to-live in milliseconds. Defaults to 300000 (5 minutes). */
  cacheTTL?: number;

  /** Global error handler invoked when an AI operation fails. */
  onError?: (error: AIFormError) => void;
}

/**
 * Metadata extracted from a Zod schema field, used to build LLM prompts
 * and understand field structure.
 */
export interface AIFieldMeta {
  /** The field name as declared in the schema. */
  name: string;

  /** Dot-notation path for nested fields (e.g. "address.street"). */
  path: string;

  /** The inferred type of the field from the Zod schema. */
  type: "string" | "number" | "boolean" | "date" | "enum" | "array" | "object";

  /** Human-readable description from Zod's `.describe()` method. */
  description: string;

  /** Whether the field is required (not optional/nullable). */
  required: boolean;

  /** Possible values for `z.enum()` fields. */
  enumValues?: string[];

  /** Validation constraints extracted from Zod refinements like `.min()`, `.max()`, `.email()`. */
  constraints?: {
    /** Minimum value (for numbers) or minimum length (for strings/arrays). */
    min?: number;

    /** Maximum value (for numbers) or maximum length (for strings/arrays). */
    max?: number;

    /** Regex pattern the value must match. */
    pattern?: string;

    /** Semantic format hint (e.g. 'email', 'url', 'uuid'). */
    format?: string;
  };
}

/**
 * Emitted when a streaming AI response produces a new value for a form field.
 */
export interface AIFieldUpdate {
  /** Dot-notation path of the field being updated. */
  fieldPath: string;

  /** The new value produced by the AI for this field. */
  value: unknown;

  /** The value the field held before this update. */
  previousValue: unknown;

  /** Whether this is the final update for this field (no more streaming tokens expected). */
  isComplete: boolean;

  /** Unix timestamp in milliseconds when this update was produced. */
  timestamp: number;
}

/**
 * Result of a complete form fill operation, summarizing which fields
 * were filled, skipped, or errored.
 */
export interface AIFillResult {
  /** Whether the overall fill operation completed without critical errors. */
  success: boolean;

  /** Dot-notation paths of fields that were successfully filled by AI. */
  filledFields: string[];

  /** Dot-notation paths of fields skipped due to privacy configuration. */
  skippedFields: string[];

  /** Per-field errors encountered during the fill operation. */
  errors: AIFieldError[];

  /** Total wall-clock duration of the fill operation in milliseconds. */
  duration: number;

  /** Number of tokens consumed, if reported by the AI provider. */
  tokensUsed?: number;
}

/**
 * An error associated with a specific form field during an AI operation.
 */
export interface AIFieldError {
  /** Dot-notation path of the field that encountered the error. */
  fieldPath: string;

  /** Machine-readable error code indicating the failure category. */
  code:
    | "validation_failed"
    | "generation_failed"
    | "privacy_blocked"
    | "timeout";

  /** Human-readable description of the error. */
  message: string;
}

/**
 * A form-level error thrown or emitted during AI operations.
 * Extends the native Error class with structured error information.
 */
export interface AIFormError extends Error {
  /** Machine-readable error code indicating the failure category. */
  code:
    | "stream_failed"
    | "provider_error"
    | "schema_error"
    | "aborted"
    | "rate_limited";

  /** Per-field errors that contributed to this form-level error, if any. */
  fieldErrors?: AIFieldError[];

  /** Whether the operation can be retried with a reasonable chance of success. */
  retryable: boolean;
}

/**
 * Provider configuration that wraps a Vercel AI SDK language model
 * with optional endpoint customization.
 */
export interface AIProvider {
  /** The language model instance from the Vercel AI SDK. */
  model: LanguageModelV1;

  /** Custom API endpoint for server-side streaming, if not using the SDK default. */
  apiEndpoint?: string;
}
