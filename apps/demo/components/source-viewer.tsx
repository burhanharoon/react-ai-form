import { promises as fs } from "node:fs"
import path from "node:path"
import { codeToHtml } from "shiki"
import { SourcePanel } from "@/components/source-panel"

export interface SourceViewerProps {
  /** Path relative to apps/demo root, e.g. "app/demos/contact/page.tsx" */
  filePath: string
  title?: string
  language?: "tsx" | "ts" | "typescript"
}

/**
 * Server Component. Reads a source file from disk at render time, runs it
 * through Shiki with a light+dark dual theme, then hands the HTML to a
 * collapsible client panel. Because files live inside the demo app we can
 * trust them and skip sandboxing.
 */
export async function SourceViewer({ filePath, title, language = "tsx" }: SourceViewerProps) {
  const absolute = path.join(/* turbopackIgnore: true */ process.cwd(), filePath)
  let source: string
  try {
    source = await fs.readFile(/* turbopackIgnore: true */ absolute, "utf8")
  } catch {
    source = `// Could not read ${filePath} — file not found.`
  }

  const html = await codeToHtml(source, {
    lang: language,
    themes: { light: "github-light", dark: "github-dark" },
    defaultColor: false,
  })

  return <SourcePanel title={title ?? filePath} html={html} />
}
