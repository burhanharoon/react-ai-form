import type { SchemaKey } from "./schemas"

/**
 * Shape mirrors ai@4 LanguageModelV1StreamPart — intentionally loose so the
 * server doesn't need to import the AI SDK in mock mode. The client proxy
 * passes these through as JSON lines, and the form-filling hooks only care
 * about `type: "text-delta"` and `type: "finish"`.
 */
export type MockStreamPart =
  | { type: "text-delta"; textDelta: string }
  | {
      type: "finish"
      finishReason: "stop"
      usage: { promptTokens: number; completionTokens: number }
    }

const MOCK_OUTPUTS: Record<SchemaKey, unknown> = {
  contact: {
    name: "Jane Chen",
    email: "jane.chen@stripe.com",
    company: "Stripe",
    role: "Chief Technology Officer",
    message:
      "Exploring enterprise options for our payments infrastructure. " +
      "Would love to learn more about your platform's fit for large-scale deployments.",
  },
  product: {
    name: "Aurora Wireless Earbuds",
    description:
      "All-day comfort meets studio-grade audio. Active noise cancelling, " +
      "40-hour battery life, and seamless device switching keep you " +
      "focused wherever work takes you.",
    category: "electronics",
    price: 149,
    tags: ["wireless", "earbuds", "anc", "premium", "travel"],
  },
  application: {
    firstName: "Alex",
    lastName: "Morgan",
    email: "alex.morgan@example.com",
    phone: "+1 415-555-0134",
    company: "Acme Labs",
    role: "Senior Software Engineer",
    yearsExperience: 8,
    bio:
      "Engineer with eight years shipping distributed systems at scale. " +
      "Previously led the platform team at Acme Labs through a 10x traffic " +
      "ramp. Passionate about developer experience and reliability.",
    skills: ["typescript", "node.js", "postgres", "kubernetes", "terraform", "react"],
  },
}

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size))
  }
  return chunks
}

/**
 * Yields a stream of MockStreamPart objects that looks like a slowly-arriving
 * JSON document. The AI SDK's streamObject parser reads `text-delta` parts,
 * incrementally parses JSON, and emits partial objects — so by chunking the
 * serialized output character-by-character we get real streaming UI behavior.
 */
export async function* mockStream(key: SchemaKey, delayMs = 18): AsyncGenerator<MockStreamPart> {
  const output = MOCK_OUTPUTS[key]
  const json = JSON.stringify(output)
  const chunks = chunkText(json, 3)

  for (const chunk of chunks) {
    await new Promise(resolve => setTimeout(resolve, delayMs))
    yield { type: "text-delta", textDelta: chunk }
  }

  yield {
    type: "finish",
    finishReason: "stop",
    usage: { promptTokens: 150, completionTokens: chunks.length },
  }
}

/** Single-shot variant for non-streaming generate (used by useAISuggestion). */
export function mockGenerate(key: SchemaKey): string {
  return JSON.stringify(MOCK_OUTPUTS[key])
}

/** Short, typed-ahead suggestion completion used by useAISuggestion. */
const SUGGESTION_COMPLETIONS: Record<string, string[]> = {
  description: [
    " Premium quality with a minimalist design.",
    " Crafted from sustainable materials for long-lasting use.",
    " Engineered for performance and everyday comfort.",
  ],
  name: [" Premium Edition", " Pro Max", " — Limited Release"],
}

export function mockSuggestion(fieldName: string, value: string): string {
  const options = SUGGESTION_COMPLETIONS[fieldName] ?? [" and delivers on every detail."]
  const index = Math.min(Math.floor(value.length / 7), options.length - 1)
  return options[index] ?? options[0] ?? ""
}
