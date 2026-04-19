import { Sparkles } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"

const demos = [
  { href: "/demos/contact", label: "Contact" },
  { href: "/demos/suggestions", label: "Suggestions" },
  { href: "/demos/application", label: "Application" },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="container mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <span>react-ai-form</span>
        </Link>
        <nav className="hidden items-center gap-4 text-sm sm:flex">
          {demos.map(demo => (
            <Link
              key={demo.href}
              href={demo.href}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {demo.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <a
              href="https://github.com/burhanharoon/react-ai-form"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
