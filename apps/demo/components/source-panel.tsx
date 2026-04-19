"use client"

import { ChevronDown, Code } from "lucide-react"
import { useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

export interface SourcePanelProps {
  title: string
  html: string
}

export function SourcePanel({ title, html }: SourcePanelProps) {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-xl border">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50">
        <span className="flex items-center gap-2">
          <Code className="h-4 w-4 text-muted-foreground" />
          <span>{title}</span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t">
          <div
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki output from our own source files
            dangerouslySetInnerHTML={{ __html: html }}
            className="source-viewer max-h-[480px] overflow-auto text-xs [&_pre]:!bg-transparent [&_pre]:p-4 [&_pre]:!leading-relaxed"
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
