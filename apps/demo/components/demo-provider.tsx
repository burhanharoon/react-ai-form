"use client"

import { AIFormProvider } from "@react-ai-form/react-hook-form"
import { type ReactNode, useMemo } from "react"
import { createProxyModel } from "@/lib/proxy-model"

export function DemoProvider({ children }: { children: ReactNode }) {
  const model = useMemo(() => createProxyModel(), [])
  return (
    <AIFormProvider model={model} config={{ debounceMs: 400 }}>
      {children}
    </AIFormProvider>
  )
}
