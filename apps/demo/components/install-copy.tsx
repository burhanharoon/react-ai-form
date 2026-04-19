"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

const COMMAND = "npm install @react-ai-form/react-hook-form"

export function InstallCopy() {
  const [copied, setCopied] = useState(false)

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(COMMAND)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard may be blocked (e.g. insecure origin); fall back silently.
    }
  }

  return (
    <div className="group flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-2 font-mono text-sm">
      <span className="select-all text-muted-foreground">$</span>
      <span className="select-all">{COMMAND}</span>
      <Button
        variant="ghost"
        size="icon"
        className="ml-auto h-7 w-7"
        onClick={onClick}
        aria-label="Copy install command"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  )
}
