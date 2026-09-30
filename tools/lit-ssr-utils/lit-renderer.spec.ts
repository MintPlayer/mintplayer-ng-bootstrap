/**
 * The real renderer the chrome generators fall back to. Its one job beyond
 * delegating to @lit-labs/ssr is ORDER: the DOM shim before lit, lit before the
 * element modules. This spec renders a real LitElement with a shadow root
 * through it and checks the output is the Declarative Shadow DOM the
 * generators extract — i.e. that what the generators get from it is chrome.
 *
 * The shim is process-global, which is why this lives in its own spec file
 * (vitest isolates files) rather than beside the generator specs.
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';

import { extractDsdTemplate } from './lib/chrome-module.mjs';
import { createLitRenderer } from './lib/lit-renderer.mjs';

const dir = mkdtempSync(join(tmpdir(), 'mp-lit-renderer-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('createLitRenderer', () => {
  it('renders a plain template to its HTML', async () => {
    const { html, render } = await createLitRenderer();
    expect(await render(html`<p class="x">${'hello'}</p>`)).toContain('<p class="x"><!--lit-part-->hello<!--/lit-part--></p>');
  });

  it('renders an element loaded from an entry module as a shadow-root template', async () => {
    // The entry runs only after the shim and lit are loaded, as a built dist
    // bundle would. It takes lit through a global rather than a bare import,
    // because a temp file cannot resolve node_modules.
    const lit = await import('lit');
    (globalThis as Record<string, unknown>).__mpLit = lit;
    const entry = join(dir, 'element.mjs');
    writeFileSync(
      entry,
      [
        'const { LitElement, html } = globalThis.__mpLit;',
        "customElements.define('mp-renderer-probe', class extends LitElement {",
        '  render() { return html`<b>chrome</b><slot></slot>`; }',
        '});',
      ].join('\n'),
    );

    const { html, render } = await createLitRenderer([pathToFileURL(entry).href]);
    const chrome = extractDsdTemplate(await render(html`<mp-renderer-probe></mp-renderer-probe>`));
    expect(chrome).toMatch(/^<template shadowroot(mode)?="open"/);
    expect(chrome).toContain('<b>chrome</b><slot></slot>');
  });
});
