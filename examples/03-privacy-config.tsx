/**
 * react-ai-form Example: Privacy Config
 *
 * Shows both layers of the privacy story:
 *   1. Per-field opt-out — SSN and password are marked sensitivity: "high",
 *      so filterSchemaByPrivacy strips them from the schema before the
 *      prompt is built. The AI never sees they exist.
 *   2. PII redaction — emails, phones, SSNs, credit cards, and IPs in the
 *      free-text context are replaced with reversible [EMAIL_xxx]
 *      placeholders via redactPII() before the prompt leaves the browser.
 *
 * Prerequisites:
 *   npm install @react-ai-form/react-hook-form @react-ai-form/core \
 *     react-hook-form zod @hookform/resolvers ai @ai-sdk/openai
 *   export OPENAI_API_KEY=sk-...
 *
 * Drop this file into a Next.js 14+ app router page or Vite + React 18+
 * project. For production, proxy the model through your own server so the
 * API key stays out of the browser.
 */
"use client";

import { openai } from "@ai-sdk/openai";
import { zodResolver } from "@hookform/resolvers/zod";
import { redactPII } from "@react-ai-form/core";
import { useAIForm } from "@react-ai-form/react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";

const applicationSchema = z.object({
  email: z.string().email().describe("Work email"),
  notes: z.string().describe("Free-text notes about the applicant"),
  ssn: z.string().regex(/^\d{3}-\d{2}-\d{4}$/), // sensitive — will be stripped
  password: z.string().min(8), // sensitive — will be stripped
});

type Application = z.infer<typeof applicationSchema>;

export function PrivacyConfigExample() {
  const form = useForm<Application>({
    defaultValues: { email: "", notes: "", ssn: "", password: "" },
    resolver: zodResolver(applicationSchema),
  });

  const ai = useAIForm(form, {
    schema: applicationSchema,
    model: openai("gpt-4o-mini"),
    config: {
      fields: {
        // Fields flagged "high" are dropped from the schema before the
        // prompt is built. The AI never receives them as keys. Setting
        // aiEnabled: false has the same effect.
        ssn: { sensitivity: "high" },
        password: { sensitivity: "high" },
        // Lower sensitivity flags are metadata for your own logic — they
        // don't remove the field from the schema.
        email: { sensitivity: "low" },
      },
    },
  });

  const rawBio =
    "Jane Chen — Engineering lead at Acme. Reach her at jane@acme.com or +1 415-555-0134.";

  const onFill = async () => {
    // Redact PII client-side so emails/phones/SSNs/CCs/IPs never hit the
    // model. The mapping can be passed to rehydratePII() later if you need
    // to restore the originals in the local response.
    const { redacted, mapping } = redactPII(rawBio);
    console.log(`Redacted ${mapping.size} PII values before the AI saw the text.`);
    await ai.fillForm(redacted);
  };

  return (
    <form onSubmit={form.handleSubmit((data) => console.log(data))}>
      <input {...ai.register("email")} placeholder="Email" />
      <input {...ai.register("notes")} placeholder="Notes (AI fills this)" />
      <input {...ai.register("ssn")} placeholder="SSN (AI never sees this)" />
      <input {...ai.register("password")} type="password" placeholder="Password" />

      <button type="button" onClick={onFill} disabled={ai.isFillingForm}>
        {ai.isFillingForm ? "Filling…" : "Auto-fill from bio"}
      </button>
    </form>
  );
}
