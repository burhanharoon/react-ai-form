import { Analytics } from "@vercel/analytics/next"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { DemoProvider } from "@/components/demo-provider"
import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: "react-ai-form — AI-powered forms for React",
  description:
    "Streaming AI form fill, ghost-text suggestions, and privacy-first " +
    "schema-driven prompts for React Hook Form, backed by Zod and the Vercel AI SDK.",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <DemoProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </DemoProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
