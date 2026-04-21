#!/usr/bin/env node
/**
 * Verify that importing a single symbol from a package produces a smaller
 * bundle than importing everything. If the two are ~identical, tree-shaking
 * is broken and needs investigation.
 *
 * Diagnostic only — not run in CI. Run locally with: pnpm check:tree-shake
 */

import { gzipSync } from "node:zlib";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PEER_EXTERNALS = ["react", "react-dom", "react-hook-form", "zod", "ai"];

// Map package names to their built dist entry so esbuild resolves them
// exactly the way a downstream consumer's bundler would.
const WORKSPACE_ALIAS = {
  "@react-ai-form/core": join(REPO_ROOT, "packages/core/dist/index.js"),
  "@react-ai-form/react": join(REPO_ROOT, "packages/react/dist/index.js"),
  "@react-ai-form/react-hook-form": join(
    REPO_ROOT,
    "packages/react-hook-form/dist/index.js",
  ),
};

async function bundle(code) {
  const dir = mkdtempSync(join(REPO_ROOT, "node_modules", ".rai-treeshake-"));
  const entry = join(dir, "entry.mjs");
  const out = join(dir, "out.mjs");
  writeFileSync(entry, code);
  try {
    await build({
      entryPoints: [entry],
      outfile: out,
      bundle: true,
      minify: true,
      format: "esm",
      platform: "browser",
      target: "es2022",
      treeShaking: true,
      external: PEER_EXTERNALS,
      alias: WORKSPACE_ALIAS,
      absWorkingDir: REPO_ROOT,
      logLevel: "silent",
    });
    const raw = readFileSync(out);
    const gz = gzipSync(raw).length;
    return { raw: raw.length, gz };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function fmt({ raw, gz }) {
  return `raw=${(raw / 1024).toFixed(2)} KB  gzip=${(gz / 1024).toFixed(2)} KB`;
}

const cases = [
  {
    label: "@react-ai-form/react-hook-form — single import (useAIForm)",
    code: `import { useAIForm } from "@react-ai-form/react-hook-form";\nconsole.log(useAIForm);\n`,
  },
  {
    label: "@react-ai-form/react-hook-form — full surface (*)",
    code: `import * as rhf from "@react-ai-form/react-hook-form";\nconsole.log(Object.keys(rhf).length);\n`,
  },
  {
    label: "@react-ai-form/core — single import (redactPII)",
    code: `import { redactPII } from "@react-ai-form/core";\nconsole.log(redactPII);\n`,
  },
  {
    label: "@react-ai-form/core — full surface (*)",
    code: `import * as core from "@react-ai-form/core";\nconsole.log(Object.keys(core).length);\n`,
  },
];

console.log("Bundling each case with esbuild (peers externalised)...\n");

const results = [];
for (const { label, code } of cases) {
  const size = await bundle(code);
  results.push({ label, ...size });
  console.log(`  ${label}\n    ${fmt(size)}`);
}

const [rhfSingle, rhfFull, coreSingle, coreFull] = results;
const rhfDelta = rhfFull.gz - rhfSingle.gz;
const coreDelta = coreFull.gz - coreSingle.gz;

console.log(
  `\nTree-shake delta (gzip):\n` +
    `  @react-ai-form/react-hook-form:  -${(rhfDelta / 1024).toFixed(2)} KB when importing useAIForm only\n` +
    `  @react-ai-form/core:             -${(coreDelta / 1024).toFixed(2)} KB when importing redactPII only`,
);

if (rhfDelta < 256 || coreDelta < 256) {
  console.warn(
    `\n⚠️  One or both deltas are < 256 B — tree-shaking may not be eliminating unused exports.\n`,
  );
  process.exit(1);
}
console.log("\n✓ Tree-shaking is pruning unused exports.");
