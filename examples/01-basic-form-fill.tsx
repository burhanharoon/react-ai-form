/**
 * react-ai-form Example: Basic Form Fill
 *
 * The simplest possible integration: one Zod schema, one useAIForm hook,
 * one "Fill with AI" button. Every input is populated by a single
 * streamObject() call — user-edited fields are automatically protected.
 *
 * Prerequisites:
 *   npm install @react-ai-form/react-hook-form react-hook-form zod \
 *     @hookform/resolvers ai @ai-sdk/openai
 *   export OPENAI_API_KEY=sk-...
 *
 * Drop this file into a Next.js 14+ app router page or Vite + React 18+
 * project. For production, proxy the model through your own server so the
 * API key stays out of the browser.
 */
"use client";

import { openai } from "@ai-sdk/openai";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAIForm } from "@react-ai-form/react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";

// A Zod schema is the single source of truth for BOTH form validation and
// the structured output the LLM is constrained to produce. `.describe()`
// becomes part of the prompt the AI sees — use it to steer extraction.
const contactSchema = z.object({
  name: z.string().min(1).describe("Full name"),
  email: z.string().email().describe("Work email address"),
  company: z.string().min(1).describe("Current company name"),
});

type Contact = z.infer<typeof contactSchema>;

export function BasicFormFillExample() {
  // Standard react-hook-form setup with the Zod resolver.
  const form = useForm<Contact>({
    defaultValues: { name: "", email: "", company: "" },
    resolver: zodResolver(contactSchema),
  });

  // useAIForm wires streaming AI output into RHF's setValue, tracks which
  // fields have been AI-filled vs user-modified, and awaits form.trigger()
  // so formState.errors is current by the time onFillComplete fires.
  const { register, fillForm, isFillingForm, progress } = useAIForm(form, {
    schema: contactSchema,
    model: openai("gpt-4o-mini"),
  });

  return (
    <form onSubmit={form.handleSubmit((data) => console.log("submitted:", data))}>
      <input {...register("name")} placeholder="Full name" />
      <input {...register("email")} placeholder="Email" />
      <input {...register("company")} placeholder="Company" />

      <button
        type="button"
        onClick={() => fillForm("Jane Chen, CTO at Acme Corp, jane@acme.com")}
        disabled={isFillingForm}
      >
        {isFillingForm ? `Filling ${progress.filled}/${progress.total}…` : "✨ Fill with AI"}
      </button>
    </form>
  );
}
