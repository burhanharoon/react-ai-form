/**
 * react-ai-form Example: Custom Provider (Ollama)
 *
 * Point react-ai-form at a local Ollama daemon instead of OpenAI. Your
 * data never leaves the machine — the prompt + completion stay on
 * localhost:11434. Great for PII-heavy internal tools, air-gapped demos,
 * and cost-sensitive prototyping.
 *
 * Prerequisites:
 *   npm install @react-ai-form/react-hook-form react-hook-form zod \
 *     @hookform/resolvers ai @ai-sdk/openai-compatible
 *   # install Ollama and pull a model with solid structured-output support
 *   ollama pull llama3.1        # or qwen2.5, mistral-nemo
 *   ollama serve                # runs on http://localhost:11434 by default
 *
 * Drop this file into a Next.js 14+ app router page or Vite + React 18+
 * project. No API key needed — Ollama runs locally.
 */
"use client";

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAIForm } from "@react-ai-form/react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Ollama exposes an OpenAI-compatible /v1 endpoint, so the AI SDK's
// generic createOpenAICompatible factory works without a dedicated adapter.
const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: "http://localhost:11434/v1",
});

const contactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  company: z.string().min(1),
});

type Contact = z.infer<typeof contactSchema>;

export function OllamaProviderExample() {
  const form = useForm<Contact>({
    defaultValues: { name: "", email: "", company: "" },
    resolver: zodResolver(contactSchema),
  });

  const { register, fillForm, isFillingForm } = useAIForm(form, {
    schema: contactSchema,
    // Structured output support varies by model. llama3.1, qwen2.5, and
    // mistral-nemo all handle JSON-mode / function-calling reliably.
    model: ollama("llama3.1"),
  });

  return (
    <form onSubmit={form.handleSubmit((data) => console.log(data))}>
      <p>🔒 Running locally — nothing leaves your machine.</p>
      <input {...register("name")} placeholder="Name" />
      <input {...register("email")} placeholder="Email" />
      <input {...register("company")} placeholder="Company" />
      <button type="button" onClick={() => fillForm("CTO at Acme Corp")} disabled={isFillingForm}>
        {isFillingForm ? "Filling…" : "✨ Fill with local AI"}
      </button>
    </form>
  );
}
