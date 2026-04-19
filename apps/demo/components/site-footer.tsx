export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="container mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row">
        <p>
          Built with{" "}
          <a
            href="https://github.com/burhanharoon/react-ai-form"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground hover:underline"
          >
            react-ai-form
          </a>
        </p>
        <nav className="flex items-center gap-4">
          <a
            href="https://github.com/burhanharoon/react-ai-form"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/@react-ai-form/react-hook-form"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            npm
          </a>
          <a
            href="https://github.com/burhanharoon/react-ai-form/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            MIT
          </a>
        </nav>
      </div>
    </footer>
  )
}
