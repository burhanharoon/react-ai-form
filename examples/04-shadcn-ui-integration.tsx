/**
 * react-ai-form Example: shadcn/ui Integration
 *
 * Drops react-ai-form into a standard shadcn/ui Form. Uses shadcn's Form/
 * FormField/FormItem/etc. for the scaffolding and AIFormFillerButton
 * (asChild) so the "Fill with AI" button inherits the shadcn Button style.
 *
 * Assumes you've run:
 *   pnpm dlx shadcn@latest add form input button label
 * The `@/components/ui/*` imports are shadcn's default path aliases.
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
import { AIConfidenceBadge, AIFormFillerButton } from "@react-ai-form/react";
import { useAIForm } from "@react-ai-form/react-hook-form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const contactSchema = z.object({
  name: z.string().min(1).describe("Full name"),
  email: z.string().email().describe("Work email"),
  company: z.string().min(1).describe("Company name"),
});

type Contact = z.infer<typeof contactSchema>;

export function ShadcnIntegrationExample() {
  const form = useForm<Contact>({
    defaultValues: { name: "", email: "", company: "" },
    resolver: zodResolver(contactSchema),
  });

  const ai = useAIForm(form, {
    schema: contactSchema,
    model: openai("gpt-4o-mini"),
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => console.log(data))}
        className="space-y-4"
      >
        {(["name", "email", "company"] as const).map((name) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={() => {
              // Spread useAIForm's enhanced register — it still satisfies
              // RHF's register signature, plus adds data-ai-status for CSS
              // targeting and focus tracking so edits are protected.
              const registered = ai.register(name);
              return (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="capitalize">{name}</FormLabel>
                    <AIConfidenceBadge status={registered["data-ai-status"]} size="sm" />
                  </div>
                  <FormControl>
                    <Input placeholder={name} {...registered} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        ))}

        {/* asChild lets AIFormFillerButton's state machine drive shadcn's
            Button without rendering a wrapper <button>. The child receives
            disabled + onClick automatically. */}
        <AIFormFillerButton
          asChild
          onFill={() => ai.fillForm("CTO at Stripe, interested in enterprise plan")}
          isLoading={ai.isFillingForm}
          progress={ai.progress}
        >
          <Button type="button">
            {ai.isFillingForm
              ? `Filling ${ai.progress.filled}/${ai.progress.total}…`
              : "✨ Fill with AI"}
          </Button>
        </AIFormFillerButton>
      </form>
    </Form>
  );
}
