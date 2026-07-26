import { describe, expect, it, vi } from 'vitest';

// The generated chrome is a gitignored build artifact; mock it so the
// counting/splicing logic tests run on a fresh checkout without a build.
vi.mock('./mp-carousel-chrome.generated', () => ({
  MP_CAROUSEL_DSD_CHROME_BY_COUNT: Array.from(
    { length: 13 },
    (_, n) => `<template shadowrootmode="open">[chrome-${n}]</template>`,
  ),
}));

import { injectMpCarouselDsd } from './inject-mp-carousel-dsd';

describe('injectMpCarouselDsd', () => {
  it('splices the chrome variant matching the number of child elements', () => {
    const html = '<mp-carousel animation="fade"><img src="a.png"><img src="b.png"><img src="c.png"></mp-carousel>';
    const out = injectMpCarouselDsd(html);
    expect(out).toContain('[chrome-3]');
    expect(out.indexOf('[chrome-3]')).toBeLessThan(out.indexOf('<img'));
  });

  it('counts nested element subtrees as ONE slide each', () => {
    const html = `<mp-carousel>
      <div class="card"><img src="a.png"><p>caption <b>bold</b></p></div>
      <div><span>two</span></div>
    </mp-carousel>`;
    expect(injectMpCarouselDsd(html)).toContain('[chrome-2]');
  });

  it('a nested mp-carousel counts as one slide of the outer AND gets its own chrome', () => {
    const html = '<mp-carousel><div>one</div><mp-carousel><img src="a.png"><img src="b.png"></mp-carousel></mp-carousel>';
    const out = injectMpCarouselDsd(html);
    expect(out).toContain('[chrome-2]'); // both: outer has 2 children, inner has 2 imgs
    expect((out.match(/\[chrome-2\]/g) ?? []).length).toBe(2);
  });

  it('excludes slot="play-pause" children from the slide count', () => {
    const html = '<mp-carousel><img src="a.png"><button slot="play-pause">pp</button><img src="b.png"></mp-carousel>';
    expect(injectMpCarouselDsd(html)).toContain('[chrome-2]');
  });

  it('survives ">" inside attribute values', () => {
    const html = '<mp-carousel aria-label="More > less"><img src="a.png" alt="a > b"><img src="b.png"></mp-carousel>';
    const out = injectMpCarouselDsd(html);
    expect(out).toContain('[chrome-2]');
  });

  it('stamps region semantics on the host without overriding authored values', () => {
    const out = injectMpCarouselDsd('<mp-carousel><img src="a.png"></mp-carousel>');
    expect(out).toMatch(/<mp-carousel[^>]*role="region"[^>]*aria-roledescription="carousel"[^>]*>/);

    const custom = injectMpCarouselDsd('<mp-carousel role="figure"><img src="a.png"></mp-carousel>');
    expect(custom).toContain('role="figure"');
    expect(custom).not.toContain('role="region"');
  });

  it('is idempotent (skips instances that already carry a DSD template)', () => {
    const once = injectMpCarouselDsd('<mp-carousel><img src="a.png"></mp-carousel>');
    expect(injectMpCarouselDsd(once)).toBe(once);
  });

  it('falls back to the inert variant above the pre-rendered cap', () => {
    const slides = Array.from({ length: 20 }, (_, i) => `<img src="${i}.png">`).join('');
    expect(injectMpCarouselDsd(`<mp-carousel>${slides}</mp-carousel>`)).toContain('[chrome-0]');
  });

  it('handles multiple independent instances and untouched HTML around them', () => {
    const html = '<p>before</p><mp-carousel><img></mp-carousel><p>mid</p><mp-carousel><img><img></mp-carousel>';
    const out = injectMpCarouselDsd(html);
    expect(out).toContain('[chrome-1]');
    expect(out).toContain('[chrome-2]');
    expect(out).toContain('<p>before</p>');
    expect(out).toContain('<p>mid</p>');
  });

  it('leaves HTML without carousels untouched', () => {
    expect(injectMpCarouselDsd('<div>nothing here</div>')).toBe('<div>nothing here</div>');
  });
});
