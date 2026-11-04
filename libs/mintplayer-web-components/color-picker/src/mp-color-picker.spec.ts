import { afterEach, describe, expect, it } from 'vitest';
import { MpColorPicker } from './generated';

void MpColorPicker; // force the side-effect registration

/**
 * The Lit color-picker front (#458 M7). The core's aria spec covers the bags and the key map;
 * this pins the DOM behaviour: the controls come alive once attached, the wheel's keys and the
 * sliders recolor and emit, and the switch reveals the channel sliders.
 */

async function settle(el: HTMLElement & { updateComplete?: Promise<unknown> }): Promise<void> {
  await el.updateComplete;
  await Promise.resolve();
  await el.updateComplete;
}

async function mount(markup: string): Promise<MpColorPicker> {
  const host = document.createElement('div');
  host.innerHTML = markup;
  document.body.append(host);
  const el = host.querySelector('mp-color-picker') as MpColorPicker;
  await settle(el);
  return el;
}

const wheel = (el: Element) => el.querySelector('[role=slider]') as HTMLElement;
const slider = (el: Element, channel: string) => el.querySelector(`[data-color-channel=${channel}]`) as HTMLInputElement | null;

function collect(el: Element, type: string): unknown[] {
  const seen: unknown[] = [];
  el.addEventListener(type, (e) => seen.push((e as CustomEvent).detail));
  return seen;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mp-color-picker', () => {
  it('enables the wheel and the sliders once attached', async () => {
    const el = await mount('<mp-color-picker></mp-color-picker>');
    expect(wheel(el).getAttribute('tabindex')).toBe('0');
    expect(wheel(el).hasAttribute('aria-disabled')).toBe(false);
    expect(slider(el, 'brightness')?.disabled).toBe(false);
  });

  it('turns the hue with the arrow keys and reports the new hex', async () => {
    const el = await mount('<mp-color-picker value="#ff0000"></mp-color-picker>');
    const changes = collect(el, 'valuechange');
    const key = new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true, cancelable: true });
    wheel(el).dispatchEvent(key);
    await settle(el);
    expect(key.defaultPrevented).toBe(true);
    expect(wheel(el).getAttribute('aria-valuenow')).toBe('30');
    expect(el.value).toBe('#ff8000');
    expect(changes).toEqual(['#ff8000']);
  });

  it('darkens with the brightness slider', async () => {
    const el = await mount('<mp-color-picker value="#ff0000"></mp-color-picker>');
    const input = slider(el, 'brightness') as HTMLInputElement;
    input.value = '50';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(el);
    expect(el.value).toBe('#800000');
  });

  it('reveals the hue and saturation sliders with the switch', async () => {
    const el = await mount('<mp-color-picker></mp-color-picker>');
    expect(slider(el, 'hue')).toBeNull();
    const toggle = el.querySelector('[role=switch]') as HTMLInputElement;
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true }));
    await settle(el);
    expect(slider(el, 'hue')).not.toBeNull();
    expect(slider(el, 'saturation')).not.toBeNull();
    expect(el.channelSlidersVisible).toBe(true);
  });

  it('keeps the hue of a grey picked from outside', async () => {
    const el = await mount('<mp-color-picker value="#00ff00"></mp-color-picker>');
    el.value = '#808080';
    await settle(el);
    expect(wheel(el).getAttribute('aria-valuenow')).toBe('120');
    expect(wheel(el).getAttribute('aria-valuetext')).toBe('Hue 120°, saturation 0%');
  });
});
