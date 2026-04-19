import { DemoPageHeader } from "@/components/demo-page-header"
import { SourceViewer } from "@/components/source-viewer"
import { SuggestionsDemo } from "./suggestions-demo"

export default function SuggestionsDemoPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <DemoPageHeader
        eyebrow="Demo 2 · useAISuggestion"
        title="Ghost-text completions as you type"
        description="Inline autocomplete for single fields. Debounced, cached, cancellable. Tab to accept — nothing else changes about your form."
      />
      <SuggestionsDemo />
      <div className="mt-10 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Source
        </h2>
        <SourceViewer
          title="app/demos/suggestions/suggestions-demo.tsx"
          filePath="app/demos/suggestions/suggestions-demo.tsx"
        />
      </div>
    </div>
  )
}
