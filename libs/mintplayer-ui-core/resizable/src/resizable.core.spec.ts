import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { glyphLabel, resizableCore, type ResizableInputs, type ResizableView } from './resizable.core';

const inputs = (o: Partial<ResizableInputs> = {}): ResizableInputs => ({
  positioning: 'absolute',
  horizontal: true,
  vertical: true,
  corners: true,
  labels: null,
  presetPosition: null,
  ...o,
});

/** jsdom has no PointerEvent: a MouseEvent carrying the pointer fields. */
const pointer = (type: string, o: { x?: number; y?: number; id?: number; kind?: string; button?: number } = {}) => {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: o.x ?? 0, clientY: o.y ?? 0, button: o.button ?? 0 });
  Object.defineProperty(ev, 'pointerId', { value: o.id ?? 1 });
  Object.defineProperty(ev, 'pointerType', { value: o.kind ?? 'mouse' });
  return ev;
};

beforeEach(() => {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
    { left: 100, top: 100, width: 200, height: 100, right: 300, bottom: 200, x: 100, y: 100, toJSON: () => ({}) } as DOMRect,
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

function mount(o: Partial<ResizableInputs> = {}, host?: HTMLElement) {
  const markup = ({ view }: { view: ResizableView }, h: HTMLElement) => {
    applyBag(h, view.root);
    return [...view.glyphs.map((g) => el('div', g.attrs)), el('p', null, 'Content')];
  };
  const h = hostCore(resizableCore, inputs(o), { markup, host });
  h.attach();
  h.render();
  const glyph = (key: string) => h.host.querySelector<HTMLElement>(`[data-resize-glyph="${key}"]`)!;
  return { ...h, glyph };
}

describe('resizableCore', () => {
  it('names glyphs from a partial translation table', () => {
    expect(glyphLabel(['left'], { left: 'Links' })).toBe('Links');
    expect(glyphLabel([], null)).toBeNull();
  });

  it('drags a glyph with the pointer, following only its own pointer, and reports the result', () => {
    const h = mount();
    const corner = h.glyph('bottom end');
    corner.setPointerCapture = vi.fn(() => {
      throw new Error('synthetic');
    });
    const down = pointer('pointerdown', { x: 300, y: 200 });
    corner.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(h.state().active).toBe('bottom end');
    h.render();
    expect(h.glyph('bottom end').className).toContain('active');

    // A second pointer neither starts another drag nor moves this one.
    h.glyph('top').dispatchEvent(pointer('pointerdown', { id: 2 }));
    document.dispatchEvent(pointer('pointermove', { x: 900, y: 900, id: 2 }));
    document.dispatchEvent(pointer('pointerup', { id: 2 }));
    expect(h.state().geometry.width).toBeNull();

    document.dispatchEvent(pointer('pointermove', { x: 350, y: 260 }));
    expect(h.state().geometry).toMatchObject({ width: 250, height: 160 });
    document.dispatchEvent(pointer('pointerup'));
    expect(h.state().active).toBeNull();
    expect(h.events('resized')).toEqual([expect.objectContaining({ width: 250, height: 160 })]);
    document.dispatchEvent(pointer('pointermove', { x: 500, y: 500 }));
    expect(h.state().geometry.width).toBe(250);
  });

  it('ignores secondary buttons, non-glyph targets, and does not prevent a touch pointerdown', () => {
    const h = mount();
    h.glyph('end').dispatchEvent(pointer('pointerdown', { button: 2 }));
    h.host.querySelector('p')!.dispatchEvent(pointer('pointerdown'));
    expect(h.state().active).toBeNull();
    const touch = pointer('pointerdown', { kind: 'touch' });
    h.glyph('end').dispatchEvent(touch);
    expect(touch.defaultPrevented).toBe(false);
    expect(h.state().active).toBe('end');
    document.dispatchEvent(pointer('pointercancel'));
    expect(h.state().active).toBeNull();
  });

  it('ignores a nested box’s glyphs', () => {
    const h = mount();
    const inner = h.host.appendChild(el('div', { 'data-resizable': 'inner' }, el('div', { 'data-resize-glyph': 'end' })));
    inner.firstElementChild!.dispatchEvent(pointer('pointerdown'));
    expect(h.state().active).toBeNull();
  });

  it('resizes a step per arrow key, a pixel with Shift, and ignores other keys', () => {
    const h = mount({ positioning: 'inline' });
    const press = (key: string, shiftKey = false, target: HTMLElement = h.glyph('end')) => {
      const ev = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
      target.dispatchEvent(ev);
      return ev;
    };
    expect(press('ArrowRight').defaultPrevented).toBe(true);
    expect(h.state().geometry.marginRight).toBe(-10);
    press('ArrowLeft', true);
    expect(h.state().geometry.marginRight).toBe(1);
    expect(press('ArrowUp').defaultPrevented).toBe(false);
    expect(press('ArrowRight', false, h.host).defaultPrevented).toBe(false);
    expect(h.events('resized')).toHaveLength(2);
  });

  it('reads the direction on attach, so a start glyph sits on the right in RTL', () => {
    const host = document.body.appendChild(el('div', { dir: 'rtl' }));
    host.style.direction = 'rtl';
    const h = mount({}, host);
    expect(h.state().rtl).toBe(true);
    expect(h.glyph('start').className).toContain('right');
  });

  it('places a preset box, follows a new preset, and stops listening once disposed', () => {
    const preset = { left: 5, top: 6, width: 70, height: 80 };
    const h = mount({ presetPosition: preset });
    expect(h.props().view.css).toContain('width:70px');
    h.setInputs({ labels: { top: 'Boven' } });
    h.setInputs({ presetPosition: { ...preset, width: 90 } });
    expect(h.state().geometry.width).toBe(90);
    h.setInputs({ positioning: 'inline' });
    expect(h.state().geometry.width).toBe(90);
    const glyph = h.glyph('end');
    h.dispose();
    glyph.dispatchEvent(pointer('pointerdown'));
    expect(h.state().active).toBeNull();
  });
});
