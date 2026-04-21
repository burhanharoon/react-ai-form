import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: true,
  target: "es2022",
  external: [
    "react",
    "react-dom",
    "react-hook-form",
    "zod",
    "ai",
    "@react-ai-form/react",
    "@react-ai-form/core",
  ],
  // A "use client" directive is injected into every dist file by a
  // postbuild script — esbuild strips it when passed via tsup's banner
  // option, so we prepend it afterwards. See scripts/add-use-client.mjs.
});
