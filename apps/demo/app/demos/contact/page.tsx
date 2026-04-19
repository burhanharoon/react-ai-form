import { DemoPageHeader } from "@/components/demo-page-header"
import { SourceViewer } from "@/components/source-viewer"
import { ContactDemo } from "./contact-demo"

export default function ContactDemoPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <DemoPageHeader
        eyebrow="Demo 1 · streamObject"
        title="Fill a contact form with one click"
        description="Type a short context, hit the button, watch every field stream in. Protect any field by editing it — it becomes user-modified and AI won't overwrite it."
      />
      <ContactDemo />
      <div className="mt-10 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Source
        </h2>
        <SourceViewer
          title="app/demos/contact/contact-demo.tsx"
          filePath="app/demos/contact/contact-demo.tsx"
        />
      </div>
    </div>
  )
}
