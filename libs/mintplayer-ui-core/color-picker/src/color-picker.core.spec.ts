import { applyBag, el, hostCore } from '../../_conformance/host-core';
import { colorPickerCore, normalizeHex, seedColor, wheelKey, type ColorPickerInputs, type ColorPickerSlider, type ColorPickerView } from './color-picker.core';

const inputs = (o: Partial<ColorPickerInputs> = {}): ColorPickerInputs => ({
  value: '#ff0000',
  alpha: 1,
  channelSlidersVisible: false,
  size: 200,
  allowAlpha: true,
  showAccessibilityToggle: true,
  disabled: false,
  labels: null,
  ...o,
});

const range = (s: ColorPickerSlider | null) => s && el('input', s.attrs);
// The template is `mp-host`: the root bag lands on the host itself.
const markup = ({ view }: { view: ColorPickerView }, host: HTMLElement) =>
  (applyBag(host, view.root),
    el('div', view.frame,
      el('div', view.wheel),
      range(view.brightness),
      range(view.alpha),
      view.toggle && el('div', view.toggle.wrapper, el('input', view.toggle.input)),
      range(view.hue),
      range(view.saturation)));

/** jsdom has no PointerEvent: a MouseEvent carrying the pointer fields. */
const pointer = (type: string, init: { pointerId?: number; pointerType?: string; button?: number; clientX?: number; clientY?: number } = {}) => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: init.button ?? 0, clientX: init.clientX, clientY: init.clientY });
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  Object.defineProperty(event, 'pointerType', { value: init.pointerType ?? 'mouse' });
  return event;
};

const mount = (o: Partial<ColorPickerInputs> = {}) => {
  const h = hostCore(colorPickerCore, inputs(o), { markup });
  h.attach();
  const q = <T extends HTMLElement>(sel: string) => h.host.querySelector<T>(sel)!;
  const slide = (channel: string, value: string) => {
    const input = q<HTMLInputElement>(`[data-color-channel=${channel}]`);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    h.render();
  };
  const wheel = () => q('[data-color-wheel]');
  const key = (k: string, shiftKey = false) => {
    const event = new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true, cancelable: true });
    wheel().dispatchEvent(event);
    return event;
  };
  return { ...h, q, slide, wheel, key };
};

afterEach(() => document.body.replaceChildren());

describe('color picker helpers', () => {
  it('normalizes a hex and keeps the hue of a grey and the saturation of black', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex(null)).toBe('#000000');
    expect(seedColor('#808080', { hue: 120, saturation: 0.4 })).toMatchObject({ hue: 120, saturation: 0 });
    expect(seedColor('#000000', { hue: 120, saturation: 0.4 })).toMatchObject({ hue: 120, saturation: 0.4, brightness: 0 });
    expect(seedColor('#000000')).toMatchObject({ hue: 0, saturation: 0 });
  });

  it('maps the wheel keys, and nothing else', () => {
    expect(wheelKey('ArrowRight', false, 358, 0.5)).toEqual({ hue: 3, saturation: 0.5 });
    expect(wheelKey('ArrowLeft', true, 0, 0.5)).toEqual({ hue: 359, saturation: 0.5 });
    expect(wheelKey('PageUp', false, 0, 0.5)?.hue).toBe(30);
    expect(wheelKey('PageDown', false, 0, 0.5)?.hue).toBe(330);
    expect(wheelKey('ArrowUp', false, 0, 0.98)?.saturation).toBe(1);
    expect(wheelKey('ArrowDown', true, 0, 0.5)?.saturation).toBe(0.49);
    expect(wheelKey('Home', false, 0, 0.5)?.saturation).toBe(1);
    expect(wheelKey('End', false, 0, 0.5)?.saturation).toBe(0);
    expect(wheelKey('a', false, 0, 0.5)).toBeNull();
  });
});

describe('colorPickerCore', () => {
  it('renders every control disabled until hydrated, then live', () => {
    const server = hostCore(colorPickerCore, inputs({ alpha: Number.NaN }), { hydrated: false, label: 'Tint' });
    const { view } = server.props();
    expect(server.state().alpha).toBe(0);
    expect(view.root['aria-label']).toBe('Tint');
    expect(view.wheel).toMatchObject({ tabindex: '-1', 'aria-disabled': 'true' });
    expect(view.brightness.attrs['disabled']).toBe('');
    expect(view.hue).toBeNull();

    const live = hostCore(colorPickerCore, inputs({ channelSlidersVisible: true, size: -5, disabled: true, allowAlpha: false }), { hydrated: true });
    const v = live.props().view;
    expect(v.root['aria-disabled']).toBe('true');
    expect(v.frameStyle['--mp-color-picker-size']).toBe('0px');
    expect(v.alpha).toBeNull();
    expect(v.hue?.attrs['aria-valuetext']).toBe('0°');
    expect(v.toggle?.checked).toBe(true);

    const bare = hostCore(colorPickerCore, inputs({ showAccessibilityToggle: false, channelSlidersVisible: true }), { hydrated: true }).props().view;
    expect(bare.toggle).toBeNull();
    expect(bare.saturation).toBeNull();
  });

  it('recolors from the sliders and reports only real changes', () => {
    const h = mount({ channelSlidersVisible: true });
    h.slide('brightness', '50');
    expect(h.state().brightness).toBe(0.5);
    expect(h.events('valueChange')).toEqual(['#800000']);
    h.slide('hue', '120');
    h.slide('saturation', '100');
    expect(h.events('valueChange').at(-1)).toBe('#008000');
    h.slide('saturation', '100');
    expect(h.events('valueChange')).toHaveLength(2);
    h.slide('alpha', '40');
    expect(h.events('alphaChange')).toEqual([0.4]);
    h.slide('alpha', '40');
    expect(h.events('alphaChange')).toHaveLength(1);
  });

  it('ignores a non-numeric slider, a slider of another picker, and every slider while disabled', () => {
    const h = mount();
    const text = h.host.appendChild(el('input', { 'data-color-channel': 'brightness' })) as HTMLInputElement;
    text.value = 'x';
    text.dispatchEvent(new Event('input', { bubbles: true }));
    const foreign = el('div', { 'data-color-picker': 'other' }, el('input', { 'data-color-channel': 'brightness', value: '10' }));
    h.host.append(foreign);
    foreign.querySelector('input')!.dispatchEvent(new Event('input', { bubbles: true }));
    h.host.dispatchEvent(new Event('input', { bubbles: true }));
    expect(h.events('valueChange')).toEqual([]);
    h.setInputs({ disabled: true });
    h.slide('brightness', '10');
    expect(h.events('valueChange')).toEqual([]);
  });

  it('shows the channel sliders through the toggle', () => {
    const h = mount();
    const toggle = h.q<HTMLInputElement>('[data-color-toggle]');
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    expect(h.state().channelSlidersVisible).toBe(true);
    expect(h.events('channelSlidersVisibleChange')).toEqual([true]);
    h.host.dispatchEvent(new Event('change', { bubbles: true }));
    expect(h.events('channelSlidersVisibleChange')).toHaveLength(1);
  });

  it('turns and tints with the wheel keys', () => {
    const h = mount({ value: '#ff8080' });
    expect(h.key('ArrowRight').defaultPrevented).toBe(true);
    expect(h.state().hue).toBe(5);
    expect(h.key('x').defaultPrevented).toBe(false);
    h.key('Home');
    h.key('Home');
    expect(h.state().saturation).toBe(1);
    h.q('[data-color-channel=brightness]').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    h.setInputs({ disabled: true });
    h.key('End');
    expect(h.state().saturation).toBe(1);
  });

  it('picks hue and saturation by dragging the wheel', () => {
    const h = mount();
    const wheel = h.wheel();
    wheel.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    wheel.setPointerCapture = vi.fn();
    const down = pointer('pointerdown', { clientX: 50, clientY: 0 });
    wheel.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(wheel);
    expect(h.state().saturation).toBeCloseTo(1);
    wheel.dispatchEvent(pointer('pointermove', { clientX: 50, clientY: 50 }));
    expect(h.state().saturation).toBeCloseTo(0);
    wheel.dispatchEvent(pointer('pointermove', { pointerId: 2, clientX: 0, clientY: 50 }));
    wheel.dispatchEvent(pointer('pointerup'));
    wheel.dispatchEvent(pointer('pointermove', { clientX: 0, clientY: 50 }));
    expect(h.state().saturation).toBeCloseTo(0);
    wheel.dispatchEvent(pointer('pointercancel'));

    const touch = pointer('pointerdown', { pointerType: 'touch', clientX: 100, clientY: 50 });
    wheel.dispatchEvent(touch);
    expect(touch.defaultPrevented).toBe(false);
    h.host.dispatchEvent(pointer('pointermove', { clientX: 0, clientY: 50 }));
  });

  it('ignores a secondary button, a zero-sized wheel and a disabled picker', () => {
    const h = mount();
    const wheel = h.wheel();
    wheel.dispatchEvent(pointer('pointerdown', { button: 2 }));
    wheel.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 }) as DOMRect;
    wheel.dispatchEvent(pointer('pointerdown'));
    expect(h.events('valueChange')).toEqual([]);
    h.setInputs({ disabled: true });
    wheel.dispatchEvent(pointer('pointerdown'));
    expect(h.events('valueChange')).toEqual([]);
  });

  it('follows the consumer value, alpha and toggle, but not an echo of its own pick', () => {
    const h = mount();
    h.setInputs({ value: '#00FF00' });
    expect(h.state()).toMatchObject({ value: '#00FF00', hue: 120 });
    h.setInputs({ value: '#00ff00' });
    expect(h.state().value).toBe('#00FF00');
    h.setInputs({ alpha: 0.5, channelSlidersVisible: true });
    expect(h.state()).toMatchObject({ alpha: 0.5, channelSlidersVisible: true });
    h.setInputs({ size: 10 });
    h.dispose();
  });
});
