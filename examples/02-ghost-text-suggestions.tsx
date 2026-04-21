/**
 * react-ai-form Example: Ghost-Text Suggestions
 *
 * A Gmail Smart Compose-style inline suggestion: the AI proposes a
 * completion, rendered as gray ghost text behind the caret. Tab accepts,
 * Escape dismisses, debounced ~400ms by default. No form library required —
 * useAISuggestion is form-library agnostic.
 *
 * Prerequisites:
 *   npm install @react-ai-form/react ai @ai-sdk/openai
 *   export OPENAI_API_KEY=sk-...
 *
 * Drop this file into a Next.js 14+ app router page or Vite + React 18+
 * project. For production, proxy the model through your own server so the
 * API key stays out of the browser.
 */
"use client";

import { openai } from "@ai-sdk/openai";
import { AIFieldSuggestion, useAISuggestion } from "@react-ai-form/react";
import { useState } from "react";

export function GhostTextExample() {
  const [description, setDescription] = useState("");

  // useAISuggestion watches `value`, debounces changes, and streams an AI
  // completion back as `suggestion`. It handles request cancellation when
  // the user keeps typing and caches repeated prompts in-memory (LRU).
  const { suggestion, isLoading, accept, dismiss } = useAISuggestion({
    fieldName: "description",
    value: description,
    model: openai("gpt-4o-mini"),
    debounceMs: 400, // default
    minChars: 3, // default — don't fetch until the user has committed some text
  });

  // accept() returns the combined `value + suggestion` string so you can
  // push it straight into whatever holds your field state.
  const handleAccept = () => {
    setDescription(accept());
  };

  return (
    <div>
      <label htmlFor="description">Description</label>
      <AIFieldSuggestion
        id="description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        suggestion={suggestion}
        isLoading={isLoading}
        onAccept={handleAccept}
        onDismiss={dismiss}
        placeholder="Start typing a product description…"
        acceptKey="Tab" // default — can also be "ArrowRight" or "Enter"
        showShortcutHint
      />
    </div>
  );
}
