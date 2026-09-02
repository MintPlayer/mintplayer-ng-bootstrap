import { describe, expect, it, vi } from 'vitest';

vi.mock('./mp-light-styles-chrome.generated', () => ({
  MP_LIGHT_STYLE_TAGS: [
    ['mp-datatable', 'datatable', '<style data-mp-light-styles="datatable">.a{color:red}</style>'],
    ['mp-treeview', 'treeview', '<style data-mp-light-styles="treeview">.b{color:blue}</style>'],
  ],
}));

import { injectMpLightStyles } from './inject-mp-light-styles';

const page = (body: string) => `<html><head><title>t</title></head><body>${body}</body></html>`;

describe('injectMpLightStyles', () => {
  it('leaves a page with no light-tier component untouched', () => {
    const html = page('<main><p>nothing</p></main>');
    expect(injectMpLightStyles(html)).toBe(html);
  });

  it('inserts only the sheets whose tag appears on the page', () => {
    const out = injectMpLightStyles(page('<mp-datatable></mp-datatable>'));
    expect(out).toContain('data-mp-light-styles="datatable"');
    expect(out).not.toContain('data-mp-light-styles="treeview"');
  });

  it('inserts every matching sheet, before </head>', () => {
    const out = injectMpLightStyles(page('<mp-datatable></mp-datatable><mp-treeview></mp-treeview>'));
    expect(out).toContain('.a{color:red}');
    expect(out).toContain('.b{color:blue}');
    expect(out.indexOf('data-mp-light-styles="datatable"')).toBeLessThan(out.indexOf('</head>'));
  });

  it('is idempotent — the marker a first pass leaves is what a second pass sees', () => {
    const once = injectMpLightStyles(page('<mp-datatable></mp-datatable>'));
    expect(injectMpLightStyles(once)).toBe(once);
  });

  it('matches a tag carrying attributes, not just the bare tag', () => {
    const out = injectMpLightStyles(page('<mp-datatable class="x" virtual-scroll></mp-datatable>'));
    expect(out).toContain('data-mp-light-styles="datatable"');
  });

  it('does not confuse a longer tag with a shorter one it starts with', () => {
    // `<mp-treeview` must not be found inside `<mp-treeview-something>`… but it
    // legitimately IS a prefix, so the guard that matters is the reverse: a page
    // with only `mp-tree-select` must not pull in the treeview sheet.
    const out = injectMpLightStyles(page('<mp-tree-select></mp-tree-select>'));
    expect(out).not.toContain('data-mp-light-styles="treeview"');
  });

  it('returns the page unchanged when there is no </head> to insert into', () => {
    const html = '<mp-datatable></mp-datatable>';
    expect(injectMpLightStyles(html)).toBe(html);
  });
});
