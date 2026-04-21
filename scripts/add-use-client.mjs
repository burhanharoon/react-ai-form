#!/usr/bin/env node
/**
 * Prepend a "use client" directive to each file passed in argv, and
 * shift the accompanying .map file's line mappings by one line so
 * source maps stay accurate after the injection.
 *
 * Invoked from the postbuild npm script on the react and react-hook-form
 * packages after tsup finishes building. esbuild strips the directive
 * when it is supplied via tsup's `banner` option (it considers it a
 * module-level directive inside bundled output), so we inject it here —
 * once, after build, outside esbuild's parse-and-emit cycle.
 *
 * Usage: node scripts/add-use-client.mjs dist/index.js dist/index.cjs
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const DIRECTIVE = '"use client";\n';

for (const file of process.argv.slice(2)) {
  const existing = readFileSync(file, "utf8");
  if (existing.startsWith(DIRECTIVE)) continue;
  writeFileSync(file, DIRECTIVE + existing);

  // Shift the source-map's generated-line mappings by one to keep stack
  // traces and debugger breakpoints accurate. Source-map v3 uses `;` as
  // a generated-line separator, so prepending one `;` inserts an empty
  // line at the start — matching the empty line our injected directive
  // added. https://sourcemaps.info/spec.html §4.1
  const mapFile = `${file}.map`;
  if (existsSync(mapFile)) {
    const map = JSON.parse(readFileSync(mapFile, "utf8"));
    if (typeof map.mappings === "string") {
      map.mappings = `;${map.mappings}`;
      writeFileSync(mapFile, JSON.stringify(map));
    }
  }
}
