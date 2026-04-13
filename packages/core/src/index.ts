export const CORE_VERSION = "0.0.1";

export type { AICache } from "./cache";
export { createAICache, createCacheKey } from "./cache";
export {
  classifyFieldSensitivity,
  getFieldPrivacyConfig,
  isFieldAIEnabled,
  redactPII,
  rehydratePII,
  sanitizeFormDataForAI,
} from "./privacy";
export { extractFieldMeta, filterSchemaByPrivacy, schemaToSystemPrompt } from "./schema";
export type { DeepPartial, FieldRouter } from "./stream";
export { createFieldRouter, diffPartialObjects } from "./stream";
export type {
  AIFieldConfig,
  AIFieldError,
  AIFieldMeta,
  AIFieldUpdate,
  AIFillResult,
  AIFormConfig,
  AIFormError,
  AIProvider,
} from "./types";
