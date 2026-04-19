import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface DemoPageHeaderProps {
  eyebrow: string
  title: string
  description: string
}

export function DemoPageHeader({ eyebrow, title, description }: DemoPageHeaderProps) {
  return (
    <div className="mb-8">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> Back to demos
      </Link>
      <div className="mb-2 inline-block rounded-full bg-violet-500/10 px-2 py-0.5 font-mono text-xs text-violet-600 dark:text-violet-400">
        {eyebrow}
      </div>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">{description}</p>
    </div>
  )
}
