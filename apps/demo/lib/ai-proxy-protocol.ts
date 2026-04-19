/**
 * Shared wire protocol between the client proxy model and the /api/ai-form
 * route. Options are passed through verbatim from the AI SDK's call site,
 * so the server can hand them straight to `openai().doGenerate/doStream`.
 *
 * We keep the types loose (`Record<string, unknown>`) at the transport layer
 * because `LanguageModelV1CallOptions` is a moving target across AI SDK
 * versions — by not re-declaring the full shape here we avoid brittle
 * re-typing. Both sides cast at the boundary where the real type is known.
 */
export type ProxyRequest =
  | { kind: "generate"; options: Record<string, unknown> }
  | { kind: "stream"; options: Record<string, unknown> }

/** Minimal subset of LanguageModelV1 doGenerate return that the AI SDK consumes. */
export interface ProxyGenerateResponse {
  text?: string
  toolCalls?: unknown[]
  finishReason: string
  usage: { promptTokens: number; completionTokens: number }
  rawCall?: { rawPrompt: unknown; rawSettings: Record<string, unknown> }
  rawResponse?: { headers?: Record<string, string> }
  warnings?: unknown[]
  logprobs?: unknown
  providerMetadata?: Record<string, unknown>
}

export const NDJSON_CONTENT_TYPE = "application/x-ndjson"
