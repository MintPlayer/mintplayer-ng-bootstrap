import { breakpointCss } from './ssr-css';

const at = (id: string, colStart: number, rowStart: number, colSpan = 1) => ({ id, position: { colStart, rowStart, colSpan, rowSpan: 1 } });
const tiles = [{ id: 'a' }, { id: 'b' }];
const options = { minColumnWidth: 200, gap: 16, maxColumns: 3 };

describe('breakpointCss', () => {
  const css = breakpointCss({ 3: [at('a', 1, 1, 2), at('b', 3, 1)] }, tiles, options, 'board');
  const blocks = css.split('\n');

  it('emits one block per count change, the narrowest unconditional', () => {
    expect(blocks).toHaveLength(3);
    expect(blocks[0].startsWith('#board ')).toBe(true);
    expect(blocks[1].startsWith('@container (min-width: 416px){')).toBe(true);
    expect(blocks[2].startsWith('@container (min-width: 632px){')).toBe(true);
  });

  it('sets the track template and every tile position per block, from the derivation', () => {
    expect(blocks[0]).toContain('grid-template-columns:repeat(1,minmax(0,1fr))');
    expect(blocks[0]).toContain('[data-tile-id="a"]{grid-column:1 / span 1;grid-row:1 / span 1}');
    expect(blocks[0]).toContain('[data-tile-id="b"]{grid-column:1 / span 1;grid-row:2 / span 1}');
    expect(blocks[2]).toContain('grid-template-columns:repeat(3,minmax(0,1fr))');
    expect(blocks[2]).toContain('[data-tile-id="a"]{grid-column:1 / span 2;grid-row:1 / span 1}');
  });

  it('honours an explicit map capped by the fit', () => {
    const custom = breakpointCss({}, tiles, { ...options, breakpoints: [{ minWidth: 0, columns: 1 }, { minWidth: 300, columns: 3 }] }, 'b');
    // 300 px fits only 1 column; 2 columns fit from 416 px, 3 from 632 px.
    expect(custom.split('\n').map((b) => b.match(/min-width: (\d+)px/)?.[1] ?? '0')).toEqual(['0', '416', '632']);
  });

  it('escapes ids so they cannot break out of the selector or the style element', () => {
    const evil = breakpointCss({}, [{ id: 'x"]</style><script>' }], options, '1 board');
    expect(evil).not.toContain('</style>');
    expect(evil).not.toContain('"]<');
    expect(evil.startsWith('#\\31 \\20 board ')).toBe(true);
  });
});
