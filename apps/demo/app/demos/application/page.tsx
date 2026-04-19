import { DemoPageHeader } from "@/components/demo-page-header"
import { SourceViewer } from "@/components/source-viewer"
import { ApplicationDemo } from "./application-demo"

export default function ApplicationDemoPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-12">
      <DemoPageHeader
        eyebrow="Demo 3 · privacy-first fill"
        title="LinkedIn bio → 9-field job application"
        description="Paste an About section. PII is scrubbed before anything reaches the model — then the schema-constrained AI extracts every field into React Hook Form."
      />
      <ApplicationDemo />
      <div className="mt-10 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Source
        </h2>
        <SourceViewer
          title="app/demos/application/application-demo.tsx"
          filePath="app/demos/application/application-demo.tsx"
        />
      </div>
    </div>
  )
}
