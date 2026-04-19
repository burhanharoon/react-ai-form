import { openai } from "@ai-sdk/openai"
import type { LanguageModelV1, LanguageModelV1StreamPart } from "ai"
import type { NextRequest } from "next/server"
import {
  NDJSON_CONTENT_TYPE,
  type ProxyGenerateResponse,
  type ProxyRequest,
} from "@/lib/ai-proxy-protocol"
import { type MockStreamPart, mockStream, mockSuggestion } from "@/lib/mock-responses"
import { detectSchemaKey } from "@/lib/schemas"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MODEL_ID = "gpt-4o-mini"

function isMockMode() {
  return !process.env["OPENAI_API_KEY"]
}

export async function POST(req: NextRequest) {
  let body: ProxyRequest
  try {
    body = (await req.json()) as ProxyRequest
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (body.kind === "generate") {
    return isMockMode()
      ? handleGenerateMock(body.options)
      : handleGenerateReal(body.options, req.signal)
  }
  if (body.kind === "stream") {
    return isMockMode()
      ? handleStreamMock(body.options)
      : handleStreamReal(body.options, req.signal)
  }
  return Response.json({ error: "Unknown kind" }, { status: 400 })
}

// The client routinely cancels in-flight requests (debounced suggestions,
// navigation, re-clicks). OpenAI + Next.js surface those as AbortError /
// ResponseAborted, which Next logs with a scary `⨯`. Swallow those — rethrow
// anything else so genuine failures still reach logging.
function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const name = (err as { name?: unknown }).name
  if (name === "AbortError" || name === "ResponseAborted") return true
  const message = (err as { message?: unknown }).message
  return typeof message === "string" && /abort/i.test(message)
}

async function handleGenerateReal(
  options: Record<string, unknown>,
  signal: AbortSignal,
): Promise<Response> {
  const model = openai(MODEL_ID) as LanguageModelV1
  const withSignal = { ...options, abortSignal: signal }
  try {
    const result = await model.doGenerate(
      withSignal as Parameters<LanguageModelV1["doGenerate"]>[0],
    )
    const response: ProxyGenerateResponse = {
      text: result.text,
      toolCalls: result.toolCalls as unknown[] | undefined,
      finishReason: result.finishReason,
      usage: result.usage,
      rawCall: result.rawCall,
      warnings: result.warnings as unknown[] | undefined,
    }
    return Response.json(response)
  } catch (err) {
    if (signal.aborted || isAbortError(err)) {
      return new Response(null, { status: 499 })
    }
    throw err
  }
}

async function handleStreamReal(
  options: Record<string, unknown>,
  signal: AbortSignal,
): Promise<Response> {
  const model = openai(MODEL_ID) as LanguageModelV1
  const withSignal = { ...options, abortSignal: signal }
  try {
    const result = await model.doStream(withSignal as Parameters<LanguageModelV1["doStream"]>[0])
    const ndjson = partsToNdjson(result.stream)
    return new Response(ndjson, {
      headers: {
        "Content-Type": NDJSON_CONTENT_TYPE,
        "Cache-Control": "no-store",
      },
    })
  } catch (err) {
    if (signal.aborted || isAbortError(err)) {
      return new Response(null, { status: 499 })
    }
    throw err
  }
}

// Mock-mode helpers ────────────────────────────────────────────────────

function extractPromptText(options: Record<string, unknown>): string {
  const prompt = options["prompt"]
  if (typeof prompt === "string") return prompt
  if (!Array.isArray(prompt)) return ""
  const parts: string[] = []
  for (const message of prompt) {
    if (!message || typeof message !== "object") continue
    const content = (message as { content?: unknown }).content
    if (typeof content === "string") {
      parts.push(content)
      continue
    }
    if (Array.isArray(content)) {
      for (const item of content) {
        if (item && typeof item === "object" && "text" in item) {
          const text = (item as { text?: unknown }).text
          if (typeof text === "string") parts.push(text)
        }
      }
    }
  }
  return parts.join("\n")
}

function detectSchemaKeyFromOptions(options: Record<string, unknown>) {
  const mode = options["mode"]
  if (!mode || typeof mode !== "object") return null
  const schema = (mode as { schema?: unknown }).schema
  if (!schema || typeof schema !== "object") return null
  const properties = (schema as { properties?: unknown }).properties
  if (!properties || typeof properties !== "object") return null
  return detectSchemaKey(Object.keys(properties as Record<string, unknown>))
}

function extractSuggestionFieldName(prompt: string): string {
  const match = prompt.match(/Field:\s*"([^"]+)"/)
  return match?.[1] ?? "description"
}

function extractSuggestionValue(prompt: string): string {
  const match = prompt.match(/Current value:\s*"([^"]*)"/)
  return match?.[1] ?? ""
}

async function handleGenerateMock(options: Record<string, unknown>): Promise<Response> {
  const promptText = extractPromptText(options)
  const fieldName = extractSuggestionFieldName(promptText)
  const value = extractSuggestionValue(promptText)
  await new Promise(resolve => setTimeout(resolve, 250))
  const suggestion = mockSuggestion(fieldName, value)
  const response: ProxyGenerateResponse = {
    text: suggestion,
    finishReason: "stop",
    usage: {
      promptTokens: 20,
      completionTokens: Math.max(1, Math.ceil(suggestion.length / 4)),
    },
    rawCall: { rawPrompt: null, rawSettings: {} },
  }
  return Response.json(response)
}

function handleStreamMock(options: Record<string, unknown>): Response {
  const schemaKey = detectSchemaKeyFromOptions(options) ?? "contact"
  const mockIter = mockStream(schemaKey)

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const encoder = new TextEncoder()
      const result = await mockIter.next()
      if (result.done) {
        controller.close()
        return
      }
      const part = result.value satisfies MockStreamPart
      controller.enqueue(encoder.encode(`${JSON.stringify(part)}\n`))
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": NDJSON_CONTENT_TYPE,
      "Cache-Control": "no-store",
    },
  })
}

function partsToNdjson(
  input: ReadableStream<LanguageModelV1StreamPart>,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const reader = input.getReader()
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { value, done } = await reader.read()
      if (done) {
        controller.close()
        return
      }
      controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`))
    },
    async cancel(reason) {
      await reader.cancel(reason)
    },
  })
}
