import { ArrowRight, MessageSquare, Sparkles, UserCircle } from "lucide-react"
import Link from "next/link"
import { InstallCopy } from "@/components/install-copy"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const demos = [
  {
    href: "/demos/contact",
    icon: Sparkles,
    title: "One-click form fill",
    description:
      "A contact form with a single 'Fill with AI' button. Streams every field in real-time from a plain-English context.",
    badge: "streamObject",
  },
  {
    href: "/demos/suggestions",
    icon: MessageSquare,
    title: "Ghost-text suggestions",
    description:
      "Smart autocomplete on a product description. Start typing and AI completes the sentence. Tab to accept.",
    badge: "useAISuggestion",
  },
  {
    href: "/demos/application",
    icon: UserCircle,
    title: "Bio-to-application",
    description:
      "Paste a LinkedIn About section, watch a 9-field job application fill itself. PII is redacted before the AI sees it.",
    badge: "privacy-first",
  },
]

export default function HomePage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-16 sm:py-24">
      <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-violet-500" />
          <span>Streaming · Schema-driven · Privacy-first</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          AI-powered forms for React
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          One Zod schema. One hook. Your React Hook Form becomes an AI-assisted form — streaming
          fill, ghost-text suggestions, field-level privacy — without rewriting a single input.
        </p>
        <div className="mt-8 w-full max-w-xl">
          <InstallCopy />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button asChild size="lg">
            <Link href="/demos/contact">
              Try a demo <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a
              href="https://github.com/burhanharoon/react-ai-form"
              target="_blank"
              rel="noreferrer"
            >
              Star on GitHub
            </a>
          </Button>
        </div>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-3">
        {demos.map(demo => {
          const Icon = demo.icon
          return (
            <Link key={demo.href} href={demo.href} className="group">
              <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
                    <Icon className="h-5 w-5 text-violet-500" />
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                      {demo.badge}
                    </span>
                  </div>
                  <CardTitle>{demo.title}</CardTitle>
                  <CardDescription>{demo.description}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm font-medium text-violet-500 group-hover:underline">
                  Open demo <ArrowRight className="ml-1 inline h-3 w-3" />
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </section>

      <section className="mt-24 rounded-2xl border bg-muted/30 p-8 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Running without an OpenAI key?</p>
        <p className="mt-1">
          That&apos;s fine — the server falls back to hardcoded streaming fixtures so every demo
          works end-to-end on a fresh clone. Set{" "}
          <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">
            OPENAI_API_KEY
          </code>{" "}
          to hit the real model via{" "}
          <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">/api/ai-form</code>.
        </p>
      </section>
    </div>
  )
}
