---
"@react-ai-form/core": patch
"@react-ai-form/react": patch
"@react-ai-form/react-hook-form": patch
---

Ship a `"use client"` directive on every build output of the React and React Hook Form adapter packages so Next.js App Router apps can import from Server Components without a consumer-side pragma. A dedicated CI job now runs the full test suite against React 18 on every PR to lock the `^18.0.0 || ^19.0.0` peer range. `@react-ai-form/core` has no React or DOM dependencies — a new module-graph contract test proves every public export can be invoked without a client-only global, so it's safe to import from React Server Components.
