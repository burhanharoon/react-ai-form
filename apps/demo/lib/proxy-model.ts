import type { LanguageModelV1, LanguageModelV1CallOptions, LanguageModelV1StreamPart } from "ai"
import {
  NDJSON_CONTENT_TYPE,
  type ProxyGenerateResponse,
  type ProxyRequest,
} from "./ai-proxy-protocol"

const PROXY_ENDPOINT = "/api/ai-form"

type DoGenerateResult = Awaited<ReturnType<LanguageModelV1["doGenerate"]>>
type DoStreamResult = Awaited<ReturnType<LanguageModelV1["doStream"]>>

/**
 * Strip non-serializable fields from LanguageModelV1CallOptions before POSTing
 * them across the wire. `abortSignal` is handled separately via fetch().
 */
function serializeOptions(options: LanguageModelV1CallOptions): Record<string, unknown> {
  const { abortSignal: _abortSignal, ...rest } = options as LanguageModelV1CallOptions & {
    abortSignal?: AbortSignal
  }
  return rest as unknown as Record<string, unknown>
}

/**
 * NDJSON → LanguageModelV1StreamPart TransformStream.
 * Buffers incoming bytes until a newline is seen, then parses and emits.
 */
function ndjsonParser(): TransformStream<Uint8Array, LanguageModelV1StreamPart> {
  const decoder = new TextDecoder()
  let buffer = ""
  return new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true })
      let newlineIndex = buffer.indexOf("\n")
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim()
        buffer = buffer.slice(newlineIndex + 1)
        if (line) {
          try {
            controller.enqueue(JSON.parse(line) as LanguageModelV1StreamPart)
          } catch {
            // Drop malformed line rather than crash the stream.
          }
        }
        newlineIndex = buffer.indexOf("\n")
      }
    },
    flush(controller) {
      const remaining = buffer.trim()
      if (remaining) {
        try {
          controller.enqueue(JSON.parse(remaining) as LanguageModelV1StreamPart)
        } catch {
          // Ignore trailing malformed line.
        }
      }
    },
  })
}

/**
 * A LanguageModelV1 implementation that forwards every call to /api/ai-form.
 * The OpenAI provider lives server-side — the browser only sees a same-origin
 * fetch, keeping the API key out of client bundles.
 *
 * Supports both generateText (→ doGenerate) and streamObject (→ doStream)
 * call paths. AbortSignal propagates end-to-end so the library's abort()
 * correctly cancels in-flight requests.
 */
export function createProxyModel(): LanguageModelV1 {
  return {
    specificationVersion: "v1",
    provider: "demo-proxy",
    modelId: "gpt-4o-mini",
    defaultObjectGenerationMode: "json",
    supportsImageUrls: false,
    supportsStructuredOutputs: true,

    async doGenerate(options) {
      const body: ProxyRequest = {
        kind: "generate",
        options: serializeOptions(options),
      }
      const fetchOptions: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
      if (options.abortSignal) fetchOptions.signal = options.abortSignal
      const response = await fetch(PROXY_ENDPOINT, fetchOptions)
      if (!response.ok) {
        throw new Error(`Proxy generate failed: ${response.status}`)
      }
      const payload = (await response.json()) as ProxyGenerateResponse
      const result = {
        text: payload.text,
        toolCalls: payload.toolCalls,
        finishReason: payload.finishReason,
        usage: payload.usage,
        rawCall: payload.rawCall ?? { rawPrompt: null, rawSettings: {} },
        rawResponse: payload.rawResponse,
        warnings: payload.warnings ?? [],
        logprobs: payload.logprobs,
        providerMetadata: payload.providerMetadata,
      }
      return result as unknown as DoGenerateResult
    },

    async doStream(options) {
      const body: ProxyRequest = {
        kind: "stream",
        options: serializeOptions(options),
      }
      const fetchOptions: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
      if (options.abortSignal) fetchOptions.signal = options.abortSignal
      const response = await fetch(PROXY_ENDPOINT, fetchOptions)
      if (!response.ok) {
        throw new Error(`Proxy stream failed: ${response.status}`)
      }
      const contentType = response.headers.get("content-type") ?? ""
      if (!contentType.startsWith(NDJSON_CONTENT_TYPE)) {
        throw new Error(`Unexpected content-type from proxy: ${contentType}`)
      }
      if (!response.body) {
        throw new Error("Proxy stream response had no body")
      }
      const stream = response.body.pipeThrough(ndjsonParser())
      const result = {
        stream,
        rawCall: { rawPrompt: null, rawSettings: {} },
        warnings: [],
      }
      return result as unknown as DoStreamResult
    },
  }
}
