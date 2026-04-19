"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { redactPII } from "@react-ai-form/core"
import { AIConfidenceBadge, AIFormFillerButton } from "@react-ai-form/react"
import { useAIForm } from "@react-ai-form/react-hook-form"
import { Loader2, Shield, Sparkles } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { type ApplicationInput, applicationSchema } from "@/lib/schemas"

type Status = "empty" | "ai-filled" | "user-modified"

const SAMPLE_BIO = `Alex Morgan — Senior Software Engineer at Acme Labs.
Eight years building platform infrastructure in TypeScript, Node, and Postgres.
Previously led the reliability team through a 10x traffic ramp. Kubernetes,
Terraform, and the occasional React sprint.
Reach me at alex.morgan@example.com or +1 415-555-0134.`

type ScalarFieldName = Exclude<keyof ApplicationInput, "skills">

const fieldList: Array<{
  name: ScalarFieldName
  label: string
  type?: "text" | "email" | "tel" | "number"
  multiline?: boolean
  span?: 1 | 2
}> = [
  { name: "firstName", label: "First name" },
  { name: "lastName", label: "Last name" },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone", type: "tel" },
  { name: "company", label: "Most recent company" },
  { name: "role", label: "Most recent role" },
  { name: "yearsExperience", label: "Years of experience", type: "number" },
  { name: "bio", label: "Bio", multiline: true, span: 2 },
]

export function ApplicationDemo() {
  const [bio, setBio] = useState(SAMPLE_BIO)
  const [redactionCount, setRedactionCount] = useState<number | null>(null)

  const form = useForm<ApplicationInput>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      role: "",
      yearsExperience: 0,
      bio: "",
      skills: [],
    },
    resolver: zodResolver(applicationSchema),
  })

  const ai = useAIForm(form, { schema: applicationSchema })
  const skills = form.watch("skills")

  const onFill = async (): Promise<void> => {
    const { redacted, mapping } = redactPII(bio)
    setRedactionCount(mapping.size)
    await ai.fillForm(redacted)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,1.2fr]">
      <aside className="space-y-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <Label htmlFor="bio-input" className="text-sm font-semibold">
              Paste a bio or LinkedIn summary
            </Label>
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" />
              Privacy-first
            </Badge>
          </div>
          <Textarea
            id="bio-input"
            value={bio}
            onChange={event => setBio(event.target.value)}
            rows={10}
            className="font-mono text-xs leading-relaxed"
          />
          <AIFormFillerButton
            asChild
            onFill={onFill}
            isLoading={ai.isFillingForm}
            progress={ai.progress}
          >
            <Button size="lg" className="mt-3 w-full">
              {ai.isFillingForm ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Extracting… {ai.progress.filled}/{ai.progress.total}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Auto-fill from bio
                </>
              )}
            </Button>
          </AIFormFillerButton>
          {redactionCount !== null ? (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
              <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <p className="font-medium">
                  {redactionCount > 0
                    ? `${redactionCount} PII value${redactionCount === 1 ? "" : "s"} redacted before AI`
                    : "No PII detected in your bio"}
                </p>
                <p className="mt-0.5 text-[11px] opacity-80">
                  Emails, phone numbers, SSNs, credit cards, and IPs are replaced with reversible
                  placeholders by <span className="font-mono">redactPII()</span> from{" "}
                  <span className="font-mono">@react-ai-form/core</span>.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </aside>

      <form
        onSubmit={form.handleSubmit(() => {})}
        className="space-y-4 rounded-xl border bg-card p-6 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {fieldList.map(field => {
            const options = field.type === "number" ? { valueAsNumber: true } : undefined
            const registered = options ? ai.register(field.name, options) : ai.register(field.name)
            const status = registered["data-ai-status"] as Status
            const error = form.formState.errors[field.name]?.message
            return (
              <div key={field.name} className={field.span === 2 ? "sm:col-span-2" : ""}>
                <div className="mb-1 flex items-center justify-between">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <AIConfidenceBadge status={status} size="sm" />
                </div>
                {field.multiline ? (
                  <Textarea id={field.name} rows={4} {...registered} />
                ) : (
                  <Input id={field.name} type={field.type ?? "text"} {...registered} />
                )}
                {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
              </div>
            )
          })}
        </div>

        <div>
          <Label>Skills</Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {skills.length === 0 ? (
              <p className="text-xs text-muted-foreground">Skills populate here after auto-fill.</p>
            ) : (
              skills.map(skill => (
                <Badge key={skill} variant="secondary" className="capitalize">
                  {skill}
                </Badge>
              ))
            )}
          </div>
        </div>

        {ai.error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {ai.error.message}
          </div>
        ) : null}
      </form>
    </div>
  )
}
