import { describe, expect, it, vi } from 'vitest';

// The generated chrome is a gitignored build artifact; mock it so the
// counting/splicing logic tests run on a fresh checkout without a build.
// The mock mirrors the real shape where it matters: N <details> rows per
// count-N variant, so the [open]-stamping can be asserted.
vi.mock('./mp-accordion-chrome.generated', () => {
  // Defined inside the factory: vi.mock is hoisted above any top-level const.
  const variant = (label: string, n: number) =>
    `<template shadowrootmode="open">[${label}-${n}]${Array.from(
      { length: n },
      (_, i) => `<details class="accordion-item" data-row="${i}"><summary>h</summary></details>`,
    ).join('')}</template>`;
  return {
    MP_ACCORDION_DSD_CHROME_BY_COUNT: Array.from({ length: 13 }, (_, n) => variant('single', n)),
    MP_ACCORDION_MULTI_DSD_CHROME_BY_COUNT: Array.from({ length: 13 }, (_, n) => variant('multi', n)),
  };
});

import { injectMpAccordionDsd } from './inject-mp-accordion-dsd';

const tab = (body = 'body', attrs = '') =>
  `<mp-accordion-tab accordion-tab slot="c0" ${attrs}>${body}</mp-accordion-tab>`;

describe('injectMpAccordionDsd', () => {
  it('leaves HTML without an accordion untouched', () => {
    const html = '<main><p>nothing here</p></main>';
    expect(injectMpAccordionDsd(html)).toBe(html);
  });

  it('splices the chrome variant matching the tab count', () => {
    const html = `<mp-accordion>
      <span accordion-header slot="h0">A</span><mp-accordion-tab accordion-tab slot="c0">1</mp-accordion-tab>
      <span accordion-header slot="h1">B</span><mp-accordion-tab accordion-tab slot="c1">2</mp-accordion-tab>
    </mp-accordion>`;
    const out = injectMpAccordionDsd(html);
    expect(out).toContain('[single-2]');
    expect(out.indexOf('[single-2]')).toBeLessThan(out.indexOf('accordion-header'));
  });

  it('picks the multi variant for a multi accordion', () => {
    const html = `<mp-accordion multi>${tab()}</mp-accordion>`;
    expect(injectMpAccordionDsd(html)).toContain('[multi-1]');
  });

  it('treats multi="false" as single-open', () => {
    const html = `<mp-accordion multi="false">${tab()}</mp-accordion>`;
    expect(injectMpAccordionDsd(html)).toContain('[single-1]');
  });

  it('does not mistake another attribute for multi', () => {
    const html = `<mp-accordion data-multiline="1" aria-label="multi tabs">${tab()}</mp-accordion>`;
    expect(injectMpAccordionDsd(html)).toContain('[single-1]');
  });

  it('counts markers that are a wrapper host element, not mp-accordion-tab', () => {
    const html = `<mp-accordion>
      <span accordion-header slot="h0">A</span>
      <bs-accordion-tab accordion-tab slot="c0"><div>body</div></bs-accordion-tab>
    </mp-accordion>`;
    expect(injectMpAccordionDsd(html)).toContain('[single-1]');
  });

  it('counts a bare <mp-accordion-tab> by TAG — it cannot self-tag server-side', () => {
    const html = `<mp-accordion>
      <span accordion-header slot="h0">A</span>
      <mp-accordion-tab slot="c0">vanilla, no accordion-tab attribute</mp-accordion-tab>
    </mp-accordion>`;
    expect(injectMpAccordionDsd(html)).toContain('[single-1]');
  });

  it('stamps [open] onto the details of tabs marked is-active', () => {
    const html = `<mp-accordion>
      <span accordion-header slot="h0">A</span><mp-accordion-tab accordion-tab slot="c0">1</mp-accordion-tab>
      <span accordion-header slot="h1">B</span><mp-accordion-tab accordion-tab is-active slot="c1">2</mp-accordion-tab>
      <span accordion-header slot="h2">C</span><mp-accordion-tab accordion-tab slot="c2">3</mp-accordion-tab>
    </mp-accordion>`;
    const out = injectMpAccordionDsd(html);
    expect(out).toContain('[single-3]');
    expect(out).not.toMatch(/<details open[^>]*data-row="0"/);
    expect(out).toMatch(/<details open[^>]*data-row="1"/);
    expect(out).not.toMatch(/<details open[^>]*data-row="2"/);
  });

  it('stamps nothing when no tab is active', () => {
    const out = injectMpAccordionDsd(`<mp-accordion>${tab()}</mp-accordion>`);
    expect(out).not.toContain('<details open');
  });

  it('does not count a nested accordion\'s tabs, and gives it its own chrome', () => {
    const html = `<mp-accordion>
      <span accordion-header slot="h0">Outer</span>
      <mp-accordion-tab accordion-tab slot="c0">
        <mp-accordion multi>
          <span accordion-header slot="h0">i</span><mp-accordion-tab accordion-tab slot="c0">1</mp-accordion-tab>
          <span accordion-header slot="h1">ii</span><mp-accordion-tab accordion-tab slot="c1">2</mp-accordion-tab>
        </mp-accordion>
      </mp-accordion-tab>
    </mp-accordion>`;
    const out = injectMpAccordionDsd(html);
    expect(out).toContain('[single-1]');
    expect(out).toContain('[multi-2]');
    expect(out).not.toContain('[single-3]');
  });

  it('stamps [open] per instance, not across nesting', () => {
    const html = `<mp-accordion>
      <span accordion-header slot="h0">Outer</span>
      <mp-accordion-tab accordion-tab is-active slot="c0">
        <mp-accordion>
          <span accordion-header slot="h0">i</span><mp-accordion-tab accordion-tab slot="c0">1</mp-accordion-tab>
        </mp-accordion>
      </mp-accordion-tab>
    </mp-accordion>`;
    const out = injectMpAccordionDsd(html);
    // Outer (count 1, tab 0 active) opens; inner (count 1, nothing active) stays shut.
    const outerChrome = out.slice(0, out.indexOf('<mp-accordion-tab'));
    expect(outerChrome).toMatch(/<details open/);
    const innerChrome = out.slice(out.indexOf('<mp-accordion '));
    expect(innerChrome).not.toMatch(/<details open/);
  });

  it('is not confused by a > inside an attribute value', () => {
    const html = `<mp-accordion aria-label="a > b">${tab()}</mp-accordion>`;
    expect(injectMpAccordionDsd(html)).toContain('[single-1]');
  });

  it('skips void elements when tracking depth', () => {
    const html = `<mp-accordion>
      <span accordion-header slot="h0">A</span>
      <mp-accordion-tab accordion-tab slot="c0"><img src="a.png"><br>text</mp-accordion-tab>
    </mp-accordion>`;
    expect(injectMpAccordionDsd(html)).toContain('[single-1]');
  });

  it('falls back to the tab-less variant over the count cap', () => {
    const tabs = Array.from({ length: 20 }, () => tab()).join('');
    expect(injectMpAccordionDsd(`<mp-accordion>${tabs}</mp-accordion>`)).toContain('[single-0]');
  });

  it('is idempotent — an accordion that already has a DSD is left alone', () => {
    const once = injectMpAccordionDsd(`<mp-accordion>${tab()}</mp-accordion>`);
    expect(injectMpAccordionDsd(once)).toBe(once);
  });

  it('handles several accordions in one document', () => {
    const html = `<mp-accordion>${tab()}</mp-accordion><mp-accordion multi>${tab()}${tab()}</mp-accordion>`;
    const out = injectMpAccordionDsd(html);
    expect(out).toContain('[single-1]');
    expect(out).toContain('[multi-2]');
  });
});
