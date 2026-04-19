"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AIConfidenceBadge, AIFormFillerButton } from "@react-ai-form/react"
import { useAIForm } from "@react-ai-form/react-hook-form"
import { Loader2, Sparkles } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type ContactInput, contactSchema } from "@/lib/schemas"

type Status = "empty" | "ai-filled" | "user-modified"

const SAMPLE_CONTEXT = "CTO at Stripe, interested in enterprise plan"

export function ContactDemo() {
  const [context, setContext] = useState(SAMPLE_CONTEXT)

  const form = useForm<ContactInput>({
    defaultValues: { name: "", email: "", company: "", role: "", message: "" },
    resolver: zodResolver(contactSchema),
  })

  const ai = useAIForm(form, { schema: contactSchema })

  const fieldList: Array<{
    name: keyof ContactInput
    label: string
    placeholder: string
    type?: "text" | "email"
    multiline?: boolean
  }> = [
    { name: "name", label: "Name", placeholder: "Jane Chen" },
    { name: "email", label: "Email", placeholder: "jane@company.com", type: "email" },
    { name: "company", label: "Company", placeholder: "Stripe" },
    { name: "role", label: "Role", placeholder: "Chief Technology Officer" },
    {
      name: "message",
      label: "Message",
      placeholder: "What brings you here?",
      multiline: true,
    },
  ]

  const onFill = async () => {
    await ai.fillForm(context)
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr,auto]">
      <form
        onSubmit={form.handleSubmit(() => {})}
        className="space-y-4 rounded-xl border bg-card p-6 shadow-sm"
      >
        <div className="flex items-center justify-between gap-4 rounded-lg bg-muted/40 p-3">
          <div className="flex-1">
            <Label htmlFor="context" className="text-xs uppercase text-muted-foreground">
              Context for the AI
            </Label>
            <Input
              id="context"
              value={context}
              onChange={event => setContext(event.target.value)}
              placeholder="e.g. CTO at Stripe, enterprise plan"
              className="mt-1 bg-background"
            />
          </div>
          <AIFormFillerButton
            asChild
            onFill={onFill}
            isLoading={ai.isFillingForm}
            progress={ai.progress}
          >
            <Button size="lg" className="self-end">
              {ai.isFillingForm ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Filling… {ai.progress.filled}/{ai.progress.total}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Fill with AI
                </>
              )}
            </Button>
          </AIFormFillerButton>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {fieldList.map(field => {
            const registered = ai.register(field.name)
            const status = registered["data-ai-status"] as Status
            const error = form.formState.errors[field.name]?.message
            return (
              <div key={field.name} className={field.multiline ? "sm:col-span-2" : ""}>
                <div className="mb-1 flex items-center justify-between">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <AIConfidenceBadge status={status} size="sm" />
                </div>
                {field.multiline ? (
                  <Textarea
                    id={field.name}
                    placeholder={field.placeholder}
                    rows={4}
                    {...registered}
                  />
                ) : (
                  <Input
                    id={field.name}
                    type={field.type ?? "text"}
                    placeholder={field.placeholder}
                    {...registered}
                  />
                )}
                {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
              </div>
            )
          })}
        </div>

        {ai.error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {ai.error.message}
          </div>
        ) : null}
      </form>

      <aside className="space-y-4 text-sm text-muted-foreground md:w-64">
        <div className="rounded-xl border p-4">
          <p className="font-medium text-foreground">How it works</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>Edit the context above.</li>
            <li>
              Click <span className="font-mono text-xs">Fill with AI</span>.
            </li>
            <li>Watch every field stream in.</li>
            <li>
              Edit any field — it becomes <em>user-modified</em> and is protected on re-fill.
            </li>
          </ol>
        </div>
        <div className="rounded-xl border p-4">
          <p className="font-medium text-foreground">Progress</p>
          <p className="mt-1 font-mono">
            {ai.progress.filled} / {ai.progress.total} filled
          </p>
          <p className="mt-1 text-xs">{ai.isFillingForm ? "Streaming…" : "Idle."}</p>
        </div>
      </aside>
    </div>
  )
}
