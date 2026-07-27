import { describe, expect, it, vi } from 'vitest';

// The generated chrome is a gitignored build artifact; mock it so the
// counting/splicing logic tests run on a fresh checkout without a build.
vi.mock('./mp-accordion-chrome.generated', () => ({
  MP_ACCORDION_DSD_CHROME_BY_COUNT: Array.from(
    { length: 13 },
    (_, n) => `<template shadowrootmode="open">[radio-${n}]</template>`,
  ),
  MP_ACCORDION_MULTI_DSD_CHROME_BY_COUNT: Array.from(
    { length: 13 },
    (_, n) => `<template shadowrootmode="open">[checkbox-${n}]</template>`,
  ),
}));

import { injectMpAccordionDsd } from './inject-mp-accordion-dsd';

const tab = (body = 'body') => `<mp-accordion-tab accordion-tab slot="c0">${body}</mp-accordion-tab>`;

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
    expect(out).toContain('[radio-2]');
    expect(out.indexOf('[radio-2]')).toBeLessThan(out.indexOf('accordion-header'));
  });

  it('picks the checkbox machine for a multi accordion', () => {
    const html = `<mp-accordion multi>${tab()}</mp-accordion>`;
    expect(injectMpAccordionDsd(html)).toContain('[checkbox-1]');
  });

  it('treats multi="false" as single-open', () => {
    const html = `<mp-accordion multi="false">${tab()}</mp-accordion>`;
    expect(injectMpAccordionDsd(html)).toContain('[radio-1]');
  });

  it('does not mistake another attribute for multi', () => {
    const html = `<mp-accordion data-multiline="1" aria-label="multi tabs">${tab()}</mp-accordion>`;
    expect(injectMpAccordionDsd(html)).toContain('[radio-1]');
  });

  it('counts markers that are a wrapper host element, not mp-accordion-tab', () => {
    const html = `<mp-accordion>
      <span accordion-header slot="h0">A</span>
      <bs-accordion-tab accordion-tab slot="c0"><div>body</div></bs-accordion-tab>
    </mp-accordion>`;
    expect(injectMpAccordionDsd(html)).toContain('[radio-1]');
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
    expect(out).toContain('[radio-1]');
    expect(out).toContain('[checkbox-2]');
    expect(out).not.toContain('[radio-3]');
  });

  it('is not confused by a > inside an attribute value', () => {
    const html = `<mp-accordion aria-label="a > b">${tab()}</mp-accordion>`;
    expect(injectMpAccordionDsd(html)).toContain('[radio-1]');
  });

  it('skips void elements when tracking depth', () => {
    const html = `<mp-accordion>
      <span accordion-header slot="h0">A</span>
      <mp-accordion-tab accordion-tab slot="c0"><img src="a.png"><br>text</mp-accordion-tab>
    </mp-accordion>`;
    expect(injectMpAccordionDsd(html)).toContain('[radio-1]');
  });

  it('falls back to the tab-less variant over the count cap', () => {
    const tabs = Array.from({ length: 20 }, () => tab()).join('');
    expect(injectMpAccordionDsd(`<mp-accordion>${tabs}</mp-accordion>`)).toContain('[radio-0]');
  });

  it('is idempotent — an accordion that already has a DSD is left alone', () => {
    const once = injectMpAccordionDsd(`<mp-accordion>${tab()}</mp-accordion>`);
    expect(injectMpAccordionDsd(once)).toBe(once);
  });

  it('handles several accordions in one document', () => {
    const html = `<mp-accordion>${tab()}</mp-accordion><mp-accordion multi>${tab()}${tab()}</mp-accordion>`;
    const out = injectMpAccordionDsd(html);
    expect(out).toContain('[radio-1]');
    expect(out).toContain('[checkbox-2]');
  });
});
