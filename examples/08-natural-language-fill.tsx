/**
 * react-ai-form Example: Natural Language → Structured Form
 *
 * Users type what they want in one sentence; the AI parses it into a
 * structured flight-booking form. Demonstrates onFillComplete for
 * post-stream logic (e.g., showing a summary or routing on success).
 *
 * Example input:
 *   "Book a flight from NYC to London, departing next Tuesday,
 *    2 adults, economy"
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

const flightSchema = z.object({
  origin: z.string().min(2).describe("3-letter airport code or city for departure"),
  destination: z.string().min(2).describe("3-letter airport code or city for arrival"),
  departureDate: z
    .string()
    .describe("Departure date in YYYY-MM-DD format; resolve relative phrases like 'next Tuesday'"),
  passengers: z.coerce.number().int().min(1).describe("Total number of passengers"),
  cabinClass: z
    .enum(["economy", "premium_economy", "business", "first"])
    .describe("Cabin class of service"),
});

type Flight = z.infer<typeof flightSchema>;

export function NaturalLanguageFillExample() {
  const [description, setDescription] = useState(
    "Book a flight from NYC to London, departing next Tuesday, 2 adults, economy",
  );
  const [summary, setSummary] = useState<string | null>(null);

  const form = useForm<Flight>({
    defaultValues: {
      origin: "",
      destination: "",
      departureDate: "",
      passengers: 1,
      cabinClass: "economy",
    },
    resolver: zodResolver(flightSchema),
  });

  const ai = useAIForm(form, {
    schema: flightSchema,
    model: openai("gpt-4o-mini"),
    // Fires after the stream finishes AND form.trigger() settles, so
    // formState.errors + formState.isValid reflect the new values.
    onFillComplete: (result) => {
      const values = form.getValues();
      setSummary(
        `Parsed ${result.filledFields.length} fields: ${values.origin} → ${values.destination}, ${values.departureDate}, ${values.passengers}× ${values.cabinClass}.`,
      );
    },
  });

  return (
    <form onSubmit={form.handleSubmit((data) => console.log("booking:", data))}>
      <label htmlFor="description">Describe your trip</label>
      <textarea
        id="description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        rows={3}
      />
      <button type="button" onClick={() => ai.fillForm(description)} disabled={ai.isFillingForm}>
        {ai.isFillingForm ? "Parsing…" : "✨ Parse into form"}
      </button>

      <fieldset>
        <legend>Structured</legend>
        <input {...ai.register("origin")} placeholder="Origin" />
        <input {...ai.register("destination")} placeholder="Destination" />
        <input {...ai.register("departureDate")} placeholder="YYYY-MM-DD" />
        <input {...ai.register("passengers", { valueAsNumber: true })} type="number" min={1} />
        <select {...ai.register("cabinClass")}>
          <option value="economy">Economy</option>
          <option value="premium_economy">Premium economy</option>
          <option value="business">Business</option>
          <option value="first">First</option>
        </select>
      </fieldset>

      {summary ? <p>{summary}</p> : null}
    </form>
  );
}
