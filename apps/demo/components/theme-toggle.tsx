"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"

/**
 * Dark-mode toggle button. Reads `resolvedTheme` (the actually-displayed theme)
 * rather than `theme` so it behaves correctly even when the provider is set to
 * `defaultTheme="system"`.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggle = () => setTheme(resolvedTheme === "dark" ? "light" : "dark")

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {mounted && resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  )
}
