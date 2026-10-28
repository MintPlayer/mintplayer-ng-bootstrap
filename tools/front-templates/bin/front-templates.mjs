#!/usr/bin/env node
// Usage: front-templates --config <file> [--check]
//
// Compiles the view templates the config names into each configured front.
// --check writes nothing and exits 1 when a generated file is missing or stale.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { compileFrontTemplates } from '../src/index.mjs';

const { values } = parseArgs({ options: { config: { type: 'string' }, check: { type: 'boolean', default: false } } });
if (!values.config) {
  console.error('front-templates: --config <file> is required');
  process.exit(2);
}

const { default: config } = await import(pathToFileURL(resolve(values.config)).href);
const { templates, stale } = compileFrontTemplates(config, { check: values.check });

if (values.check && stale.length) {
  console.error(`front-templates: ${stale.length} generated file(s) out of date:\n  ${stale.join('\n  ')}`);
  process.exit(1);
}
console.log(`front-templates: ${templates} template(s), ${values.check ? 'all up to date' : `${stale.length} file(s) written`}`);
