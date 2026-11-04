import { describe, expect, it } from 'vitest';
import { connectResizable, geometryCss, presetGeometry, type ResizableInputs, type ResizableState } from './resizable.core';

const inputs: ResizableInputs = {
  positioning: 'inline',
  horizontal: true,
  vertical: true,
  corners: true,
  labels: null,
  presetPosition: null,
};

const state = (over: Partial<ResizableState> = {}): ResizableState => ({
  geometry: { width: null, height: null, left: null, top: null, marginLeft: null, marginRight: null, marginTop: null, marginBottom: null },
  rtl: false,
  active: null,
  ...over,
});

const glyph = (view: ReturnType<typeof connectResizable>, key: string) => view.glyphs.find((g) => g.key === key)!.attrs;

describe('resizable', () => {
  it('renders no glyph until hydrated: they cannot work without JavaScript', () => {
    expect(connectResizable(inputs, state(), 'r1', false).glyphs).toEqual([]);
  });

  it('renders every glyph as a focusable separator', () => {
    const { glyphs } = connectResizable(inputs, state(), 'r1', true);
    expect(glyphs).toHaveLength(8);
    expect(glyphs.every((g) => g.attrs['role'] === 'separator' && g.attrs['tabindex'] === '0')).toBe(true);
  });

  it('names edges and corners by their physical side in a left-to-right document', () => {
    const view = connectResizable(inputs, state(), 'r1', true);
    expect(glyph(view, 'start')['aria-label']).toBe('Resize from left edge');
    expect(glyph(view, 'end')['aria-label']).toBe('Resize from right edge');
    expect(glyph(view, 'top')['aria-label']).toBe('Resize from top edge');
    expect(glyph(view, 'top start')['aria-label']).toBe('Resize from top-left corner');
    expect(glyph(view, 'bottom end')['aria-label']).toBe('Resize from bottom-right corner');
    expect(glyph(view, 'start')['class']).toBe('glyph left');
  });

  it('in a right-to-left document a start glyph sits on, and is named as, the right edge', () => {
    const view = connectResizable(inputs, state({ rtl: true }), 'r1', true);
    expect(glyph(view, 'start')['class']).toBe('glyph right');
    expect(glyph(view, 'start')['aria-label']).toBe('Resize from right edge');
    expect(glyph(view, 'top start')['aria-label']).toBe('Resize from top-right corner');
  });

  it('orients an edge glyph across its edge, and a corner not at all', () => {
    const view = connectResizable(inputs, state(), 'r1', true);
    expect(glyph(view, 'top')['aria-orientation']).toBe('horizontal');
    expect(glyph(view, 'start')['aria-orientation']).toBe('vertical');
    expect(glyph(view, 'top start')['aria-orientation']).toBeNull();
  });

  it('takes translated names, keeping the defaults for missing keys', () => {
    const view = connectResizable({ ...inputs, labels: { left: 'Links' } }, state(), 'r1', true);
    expect(glyph(view, 'start')['aria-label']).toBe('Links');
    expect(glyph(view, 'end')['aria-label']).toBe('Resize from right edge');
  });

  it('offers corner glyphs only when it resizes both ways', () => {
    expect(connectResizable({ ...inputs, corners: false }, state(), 'r1', true).glyphs).toHaveLength(4);
    expect(connectResizable({ ...inputs, vertical: false }, state(), 'r1', true).glyphs.map((g) => g.key)).toEqual(['end', 'start']);
  });

  it('marks the dragged glyph active', () => {
    expect(glyph(connectResizable(inputs, state({ active: 'end' }), 'r1', true), 'end')['class']).toBe('glyph right active');
  });

  it('positions itself absolutely or relatively', () => {
    expect(connectResizable(inputs, state(), 'r1', false).root['class']).toContain('position-relative');
    expect(connectResizable({ ...inputs, positioning: 'absolute' }, state(), 'r1', false).root['class']).toContain('position-absolute');
  });

  it('writes the geometry as an instance sheet for this box only, and none when there is none', () => {
    expect(geometryCss('r1', state().geometry)).toBeNull();
    expect(geometryCss('r1', { ...state().geometry, width: 300, marginLeft: -4 })).toBe('.resizable[data-resizable="r1"]{width:300px;margin-left:-4px}');
  });

  it('a preset places an absolute box and drops any margins; inline ignores it', () => {
    const preset = { left: 10, top: 20, width: 300, height: 200 };
    expect(presetGeometry({ positioning: 'absolute', presetPosition: preset })).toMatchObject({ ...preset, marginLeft: null });
    expect(presetGeometry({ positioning: 'inline', presetPosition: preset })).toBeNull();
  });
});
