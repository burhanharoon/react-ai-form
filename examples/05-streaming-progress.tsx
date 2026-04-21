/**
 * react-ai-form Example: Streaming Progress
 *
 * Fields arrive one at a time as the AI streams JSON. This example renders
 * a progress bar (filled/total) and briefly flashes each field amber as it
 * gets written, using the data-ai-status attribute that useAIForm.register
 * adds to every input.
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

const leadSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  company: z.string().min(1),
  role: z.string().min(1),
  notes: z.string(),
});

type Lead = z.infer<typeof leadSchema>;

const FIELD_ORDER: Array<keyof Lead> = [
  "firstName",
  "lastName",
  "email",
  "company",
  "role",
  "notes",
];

export function StreamingProgressExample() {
  const form = useForm<Lead>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      company: "",
      role: "",
      notes: "",
    },
    resolver: zodResolver(leadSchema),
  });

  const ai = useAIForm(form, {
    schema: leadSchema,
    model: openai("gpt-4o-mini"),
  });

  const percent = ai.progress.total === 0
    ? 0
    : Math.round((ai.progress.filled / ai.progress.total) * 100);

  return (
    <div>
      {/* Scoped <style> demonstrates the data-ai-status CSS hook —
          useAIForm.register sets this attribute on every input. */}
      <style>{`
        .lead-form input[data-ai-status="ai-filled"] {
          background-color: #fef3c7;
          transition: background-color 600ms ease-out;
        }
        .lead-form input[data-ai-status="user-modified"] {
          border-color: #10b981;
        }
        .progress-track { height: 4px; background: #e5e7eb; border-radius: 2px; }
        .progress-fill { height: 100%; background: #6366f1; transition: width 200ms linear; }
      `}</style>

      <form onSubmit={form.handleSubmit((data) => console.log(data))} className="lead-form">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>
        <p>
          {ai.isFillingForm
            ? `Streaming… ${ai.progress.filled}/${ai.progress.total}`
            : percent === 100
              ? "Done."
              : "Idle."}
        </p>

        {FIELD_ORDER.map((name) => (
          <div key={name}>
            <label htmlFor={name}>{name}</label>
            <input id={name} {...ai.register(name)} />
          </div>
        ))}

        <button
          type="button"
          onClick={() => ai.fillForm("Jane Chen, CTO at Stripe, interested in the enterprise plan")}
          disabled={ai.isFillingForm}
        >
          {ai.isFillingForm ? "Filling…" : "✨ Fill with AI"}
        </button>
      </form>
    </div>
  );
}
