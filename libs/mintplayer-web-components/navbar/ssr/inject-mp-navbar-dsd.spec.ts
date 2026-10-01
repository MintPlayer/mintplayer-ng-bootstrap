import { describe, expect, it, vi } from 'vitest';

vi.mock('./mp-navbar-chrome.generated', () => ({
  MP_NAVBAR_DSD_CHROME: '<template shadowrootmode="open">[nav]</template>',
  MP_NAVBAR_ITEM_DSD_CHROME: '<template shadowrootmode="open">[item]</template>',
  MP_NAVBAR_BRAND_DSD_CHROME: '<template shadowrootmode="open">[brand]</template>',
  MP_NAVBAR_DROPDOWN_DSD_CHROME: '<template shadowrootmode="open">[dropdown]</template>',
}));

import { injectMpNavbarDsd } from './inject-mp-navbar-dsd';

const chromeOf = (out: string, tag: string) =>
  (out.match(new RegExp(`<template shadowrootmode="open">\\[${tag}\\]</template>`, 'g')) ?? []).length;

describe('injectMpNavbarDsd', () => {
  it('returns HTML without a navbar unchanged', () => {
    const html = '<main><mp-dropdown-menu></mp-dropdown-menu></main>';
    expect(injectMpNavbarDsd(html)).toBe(html);
  });

  it('gives each navbar element its own chrome, without prefix cross-matching', () => {
    const out = injectMpNavbarDsd(
      '<mp-navbar breakpoint="lg"><mp-navbar-brand slot="brand">B</mp-navbar-brand>' +
        '<mp-navbar-item><a href="/">H</a></mp-navbar-item><mp-navbar-dropdown></mp-navbar-dropdown></mp-navbar>',
    );
    expect(out).toContain('<mp-navbar breakpoint="lg"><template shadowrootmode="open">[nav]</template>');
    expect(out).toContain('<mp-navbar-item><template shadowrootmode="open">[item]</template>');
    expect(chromeOf(out, 'nav')).toBe(1);
    expect(chromeOf(out, 'brand')).toBe(1);
    expect(chromeOf(out, 'dropdown')).toBe(1);
  });

  it('is idempotent', () => {
    const once = injectMpNavbarDsd('<mp-navbar><mp-navbar-item>x</mp-navbar-item></mp-navbar>');
    expect(injectMpNavbarDsd(once)).toBe(once);
  });

  it('marks only dropdowns nested inside a menu as submenus', () => {
    const out = injectMpNavbarDsd(
      '<mp-navbar><mp-navbar-dropdown id="top"><mp-dropdown-menu>' +
        '<li class="dropdown-item"><mp-navbar-dropdown id="sub"></mp-navbar-dropdown></li>' +
        '</mp-dropdown-menu></mp-navbar-dropdown><mp-navbar-dropdown id="after"></mp-navbar-dropdown></mp-navbar>',
    );
    expect(out).toContain('<mp-navbar-dropdown id="top">');
    expect(out).toContain('<mp-navbar-dropdown data-submenu="" id="sub">');
    expect(out).toContain('<mp-navbar-dropdown id="after">');
  });

  it('does not double-mark a dropdown that already carries data-submenu', () => {
    const out = injectMpNavbarDsd(
      '<mp-navbar><mp-dropdown-menu><mp-navbar-dropdown data-submenu></mp-navbar-dropdown></mp-dropdown-menu></mp-navbar>',
    );
    expect(out.match(/data-submenu/g)).toHaveLength(1);
  });
});
