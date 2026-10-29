#!/usr/bin/env node
// Usage: component-compiler --config <file> [--check]
//
// Compiles the component sources the config names into each configured front.
// --check writes nothing and exits 1 when a generated file is missing, stale or orphaned.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { compileComponents } from '../src/index.mjs';

const { values } = parseArgs({ options: { config: { type: 'string' }, check: { type: 'boolean', default: false } } });
if (!values.config) {
  console.error('component-compiler: --config <file> is required');
  process.exit(2);
}

const { default: config } = await import(pathToFileURL(resolve(values.config)).href);
const { templates, components, stale } = await compileComponents(config, { check: values.check });

if (values.check && stale.length) {
  console.error(`component-compiler: ${stale.length} generated file(s) out of date:\n  ${stale.join('\n  ')}`);
  process.exit(1);
}
console.log(
  `component-compiler: ${templates} template(s), ${components} component(s), ${values.check ? 'all up to date' : `${stale.length} file(s) written or removed`}`,
);
