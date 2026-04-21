#!/usr/bin/env node
/**
 * Prepend a "use client" directive to each file passed in argv.
 *
 * Invoked from tsup's onSuccess hook after react and react-hook-form
 * finish building. esbuild strips the directive when it is supplied via
 * tsup's `banner` option (it considers it a module-level directive
 * inside bundled output), so we inject it here — once, after build,
 * outside esbuild's parse-and-emit cycle.
 *
 * Usage: node scripts/add-use-client.mjs dist/index.js dist/index.cjs
 */

import { readFileSync, writeFileSync } from "node:fs";

const DIRECTIVE = '"use client";\n';

for (const file of process.argv.slice(2)) {
  const existing = readFileSync(file, "utf8");
  if (existing.startsWith(DIRECTIVE)) continue;
  writeFileSync(file, DIRECTIVE + existing);
}
