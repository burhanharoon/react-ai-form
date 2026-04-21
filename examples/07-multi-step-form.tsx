/**
 * react-ai-form Example: Multi-Step Wizard
 *
 * A 3-step form that shares one combined schema. useAIForm sees every
 * field in one shot, so a single "Fill with AI" call on step 1 populates
 * data that becomes visible later in steps 2 and 3. Fields the user edits
 * on any step are protected — even if they navigate back.
 *
 * Schema composition via z.object().extend() lets each step declare its
 * own slice while the AI still works against the full union.
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
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const personalStep = z.object({
  name: z.string().min(1).describe("Full name"),
  email: z.string().email().describe("Work email"),
  phone: z.string().min(7).describe("Phone number with country code"),
});

const companyStep = z.object({
  company: z.string().min(1).describe("Current company"),
  role: z.string().min(1).describe("Current role / job title"),
  yearsExperience: z.coerce.number().int().min(0).describe("Years of professional experience"),
});

const preferencesStep = z.object({
  plan: z.enum(["starter", "growth", "enterprise"]).describe("Subscription plan fit"),
  notes: z.string().describe("Free-text notes about fit and next steps"),
});

// One combined schema for the AI to fill. Each step renders a slice.
const applicationSchema = personalStep.extend(companyStep.shape).extend(preferencesStep.shape);
type Application = z.infer<typeof applicationSchema>;

const STEP_FIELDS: Array<Array<keyof Application>> = [
  ["name", "email", "phone"],
  ["company", "role", "yearsExperience"],
  ["plan", "notes"],
];

export function MultiStepFormExample() {
  const [step, setStep] = useState(0);

  const form = useForm<Application>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      role: "",
      yearsExperience: 0,
      plan: "starter",
      notes: "",
    },
    resolver: zodResolver(applicationSchema),
  });

  // Single useAIForm instance at the top drives all three steps. RHF's
  // register mounts inputs lazily, so calling register for fields that
  // aren't rendered yet is fine — their values still update from AI fill.
  const ai = useAIForm(form, {
    schema: applicationSchema,
    model: openai("gpt-4o-mini"),
  });

  const visibleFields = STEP_FIELDS[step] ?? [];
  const isLast = step === STEP_FIELDS.length - 1;

  return (
    <form onSubmit={form.handleSubmit((data) => console.log("submitted:", data))}>
      <p>
        Step {step + 1} / {STEP_FIELDS.length}
      </p>

      {step === 0 && (
        <button
          type="button"
          onClick={() =>
            ai.fillForm(
              "Jane Chen, Head of Platform at Stripe. 10 years engineering experience. " +
                "Looking at enterprise for multi-region compliance. jane@stripe.com, +1 415 555 0134.",
            )
          }
          disabled={ai.isFillingForm}
        >
          {ai.isFillingForm
            ? `Filling ${ai.progress.filled}/${ai.progress.total}…`
            : "✨ Auto-fill the whole wizard"}
        </button>
      )}

      {visibleFields.map((name) => (
        <div key={name}>
          <label htmlFor={name}>{name}</label>
          {name === "plan" ? (
            <select id={name} {...ai.register(name)}>
              <option value="starter">Starter</option>
              <option value="growth">Growth</option>
              <option value="enterprise">Enterprise</option>
            </select>
          ) : name === "notes" ? (
            <textarea id={name} rows={4} {...ai.register(name)} />
          ) : (
            <input
              id={name}
              {...ai.register(
                name,
                name === "yearsExperience" ? { valueAsNumber: true } : undefined,
              )}
            />
          )}
        </div>
      ))}

      <div>
        <button type="button" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          Back
        </button>
        {isLast ? (
          <button type="submit">Submit</button>
        ) : (
          <button type="button" onClick={() => setStep((s) => s + 1)}>
            Next
          </button>
        )}
      </div>
    </form>
  );
}
