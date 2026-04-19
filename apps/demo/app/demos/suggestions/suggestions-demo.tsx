"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AIFieldSuggestion } from "@react-ai-form/react"
import { AIFormField } from "@react-ai-form/react-hook-form"
import { Keyboard } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { type ProductInput, productSchema } from "@/lib/schemas"
import { cn } from "@/lib/utils"

const categoryOptions: Array<{ value: ProductInput["category"]; label: string }> = [
  { value: "electronics", label: "Electronics" },
  { value: "apparel", label: "Apparel" },
  { value: "home", label: "Home" },
  { value: "books", label: "Books" },
  { value: "other", label: "Other" },
]

export function SuggestionsDemo() {
  const form = useForm<ProductInput>({
    defaultValues: {
      name: "",
      description: "",
      category: "electronics",
      price: 0,
      tags: [],
    },
    resolver: zodResolver(productSchema),
  })

  const tags = form.watch("tags")
  const tagsText = tags.join(", ")

  return (
    <form
      onSubmit={form.handleSubmit(() => {})}
      className="space-y-5 rounded-xl border bg-card p-6 shadow-sm"
    >
      <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <Keyboard className="h-3.5 w-3.5" />
          Start typing in <span className="font-mono">description</span>; a ghost-text suggestion
          appears. Press <kbd className="rounded border bg-background px-1 font-mono">Tab</kbd> to
          accept or keep typing to ignore.
        </p>
      </div>

      <AIFormField
        form={form}
        name="name"
        aiSuggestion
        render={({
          field,
          suggestion,
          isLoadingSuggestion,
          acceptSuggestion,
          dismissSuggestion,
          aiStatus,
        }) => (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label htmlFor={field.name}>Product name</Label>
              <StatusBadge status={aiStatus} />
            </div>
            <AIFieldSuggestion
              {...field}
              id={field.name}
              className={cn(
                "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              )}
              placeholder="Aurora Wireless Earbuds"
              suggestion={suggestion}
              isLoading={isLoadingSuggestion}
              onAccept={acceptSuggestion}
              onDismiss={dismissSuggestion}
            />
          </div>
        )}
      />

      <AIFormField
        form={form}
        name="description"
        aiSuggestion
        render={({
          field,
          suggestion,
          isLoadingSuggestion,
          acceptSuggestion,
          dismissSuggestion,
          aiStatus,
        }) => (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label htmlFor={field.name}>Description</Label>
              <StatusBadge status={aiStatus} hint="Ghost text lives here" />
            </div>
            <AIFieldSuggestion
              {...field}
              id={field.name}
              className={cn(
                "flex h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              )}
              placeholder="Start typing: 'Studio-grade audio with'..."
              suggestion={suggestion}
              isLoading={isLoadingSuggestion}
              onAccept={acceptSuggestion}
              onDismiss={dismissSuggestion}
            />
          </div>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="category">Category</Label>
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="category" className="mt-1">
                  <SelectValue placeholder="Pick one" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div>
          <Label htmlFor="price">Price (USD)</Label>
          <Input
            id="price"
            type="number"
            step="1"
            min={0}
            className="mt-1"
            {...form.register("price", { valueAsNumber: true })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="tags">Tags (comma-separated)</Label>
        <Textarea
          id="tags"
          rows={2}
          className="mt-1 font-mono text-xs"
          value={tagsText}
          onChange={event =>
            form.setValue(
              "tags",
              event.target.value
                .split(",")
                .map(tag => tag.trim())
                .filter(Boolean),
            )
          }
          placeholder="wireless, anc, travel"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
      </div>
    </form>
  )
}

function StatusBadge({ status, hint }: { status: string; hint?: string }) {
  const className =
    status === "ai-filled"
      ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
      : status === "user-modified"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-muted text-muted-foreground"
  return (
    <div className="flex items-center gap-2">
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      <Badge variant="outline" className={className}>
        {status}
      </Badge>
    </div>
  )
}
