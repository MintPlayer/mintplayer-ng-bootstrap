import { afterEach, describe, expect, it } from 'vitest';
import type { CarouselSlideChangeEventDetail } from '@mintplayer/ui-core/carousel';
import './index';
import type { MpCarousel } from './index';

/**
 * `<mp-carousel>` is generated from @mintplayer/ui-core/carousel (#437) and
 * renders in the light DOM. jsdom has no Web Animations, so every move settles
 * at once; these specs pin the index store (the radios), the names, the input
 * paths and the events.
 */

const mounted: HTMLElement[] = [];
afterEach(() => mounted.splice(0).forEach((el) => el.remove()));

async function settle(el: MpCarousel): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await el.updateComplete;
    await Promise.resolve();
  }
}

async function mount(count = 3, attrs: Record<string, string> = {}): Promise<MpCarousel> {
  const el = document.createElement('mp-carousel') as MpCarousel;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  for (let i = 0; i < count; i++) {
    const item = document.createElement('mp-carousel-item');
    item.textContent = `Slide ${i}`;
    el.appendChild(item);
  }
  document.body.appendChild(el);
  mounted.push(el);
  await settle(el);
  return el;
}

/** Slides whose content reports the given heights (jsdom has no layout). */
async function mountSized(heights: number[], attrs: Record<string, string> = {}): Promise<MpCarousel> {
  const el = document.createElement('mp-carousel') as MpCarousel;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  heights.forEach((h) => {
    const item = document.createElement('mp-carousel-item');
    const content = document.createElement('div');
    Object.defineProperty(content, 'offsetHeight', { value: h });
    item.appendChild(content);
    el.appendChild(item);
  });
  document.body.appendChild(el);
  mounted.push(el);
  await settle(el);
  return el;
}

const radios = (el: Element) => [...el.querySelectorAll<HTMLInputElement>(':scope > input.car-radio')];
const checkedIndex = (el: Element) => radios(el).findIndex((r) => r.checked);
const items = (el: Element) => [...el.querySelectorAll<HTMLElement>('.carousel-track > .carousel-item')];
const inner = (el: Element) => el.querySelector<HTMLElement>(':scope > .carousel-inner')!;
const visiblePair = (el: Element, i: number) => el.querySelectorAll<HTMLElement>(':scope > .carousel-controls > .carousel-control-pair')[i];
const key = (target: Element, k: string) => target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

describe('mp-carousel', () => {
  it('renders in the light DOM with a radio and a control pair per slide', async () => {
    const el = await mount(3);
    expect(el.shadowRoot).toBeNull();
    expect(el.classList).toContain('carousel');
    expect(radios(el)).toHaveLength(3);
    expect(el.querySelectorAll(':scope > .carousel-controls > .carousel-control-pair')).toHaveLength(3);
    expect(items(el)).toHaveLength(3);
    expect(checkedIndex(el)).toBe(0);
  });

  it('names the region and each slide by its position', async () => {
    const el = await mount(3, { 'aria-label': 'Photos' });
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Photos');
    expect(items(el).map((s) => s.getAttribute('aria-label'))).toEqual(['1 of 3', '2 of 3', '3 of 3']);
    expect(items(el).map((s) => s.getAttribute('role'))).toEqual(['group', 'group', 'group']);
    expect(items(el)[0].hasAttribute('data-active')).toBe(true);
  });

  it('goes live: a focusable viewport and tabbable controls', async () => {
    const el = await mount(2);
    expect(el.hasAttribute('data-mp-hydrated')).toBe(true);
    expect(inner(el).getAttribute('tabindex')).toBe('0');
    expect(visiblePair(el, 0).querySelector('[data-step="next"]')!.getAttribute('tabindex')).toBe('0');
  });

  it('moves with the next/previous controls, wrapping, and reports each move', async () => {
    const el = await mount(3);
    const seen: number[] = [];
    el.addEventListener('slidechange', (e) => seen.push((e as CustomEvent<CarouselSlideChangeEventDetail>).detail.index));
    (visiblePair(el, 0).querySelector('[data-step="previous"]') as HTMLElement).click();
    await settle(el);
    expect(checkedIndex(el)).toBe(2);
    (visiblePair(el, 2).querySelector('[data-step="next"]') as HTMLElement).click();
    await settle(el);
    expect(checkedIndex(el)).toBe(0);
    expect(seen).toEqual([2, 0]);
    expect(items(el)[0].hasAttribute('data-active')).toBe(true);
  });

  it('jumps from an indicator and marks it current', async () => {
    const el = await mount(3, { indicators: '' });
    const dots = el.querySelectorAll<HTMLElement>(':scope > .carousel-indicators > [data-bs-target]');
    expect(dots).toHaveLength(3);
    dots[2].click();
    await settle(el);
    expect(checkedIndex(el)).toBe(2);
    expect(dots[2].getAttribute('aria-current')).toBe('true');
    expect(dots[0].hasAttribute('aria-current')).toBe(false);
  });

  it('follows the arrow keys on the viewport only', async () => {
    const el = await mount(3);
    key(inner(el), 'ArrowRight');
    await settle(el);
    expect(checkedIndex(el)).toBe(1);
    key(inner(el), 'End');
    await settle(el);
    expect(checkedIndex(el)).toBe(2);
    key(items(el)[2], 'ArrowLeft');
    await settle(el);
    expect(checkedIndex(el)).toBe(2);
  });

  it('honours keyboard-events="false"', async () => {
    const el = await mount(3);
    el.keyboardEvents = false;
    await settle(el);
    key(inner(el), 'ArrowRight');
    await settle(el);
    expect(checkedIndex(el)).toBe(0);
  });

  it('activates a control from the keyboard', async () => {
    const el = await mount(3);
    key(visiblePair(el, 0).querySelector('[data-step="next"]')!, 'Enter');
    await settle(el);
    expect(checkedIndex(el)).toBe(1);
  });

  it('exposes previous/next/goto', async () => {
    const el = await mount(4);
    el.goto(3);
    await settle(el);
    expect(checkedIndex(el)).toBe(3);
    el.previous();
    await settle(el);
    expect(checkedIndex(el)).toBe(2);
  });

  it('picks up a slide added later', async () => {
    const el = await mount(2);
    el.appendChild(document.createElement('mp-carousel-item'));
    await settle(el);
    await new Promise((r) => setTimeout(r));
    await settle(el);
    expect(radios(el)).toHaveLength(3);
    expect(items(el)[2].getAttribute('aria-label')).toBe('3 of 3');
  });

  it('sizes the viewport to the current slide and follows it', async () => {
    const el = await mountSized([120, 300, 200]);
    const height = () => inner(el).style.getPropertyValue('--mp-carousel-viewport-height');
    expect(height()).toBe('120px');
    (visiblePair(el, 0).querySelector('[data-step="next"]') as HTMLElement).click();
    await settle(el);
    expect(height()).toBe('300px');
    expect(inner(el).style.getPropertyValue('--mp-carousel-slide-height')).toBe('');
  });

  it('sizes a vertical viewport and its cells to the tallest slide', async () => {
    const el = await mountSized([120, 300, 200], { orientation: 'vertical' });
    expect(inner(el).style.getPropertyValue('--mp-carousel-viewport-height')).toBe('300px');
    expect(inner(el).style.getPropertyValue('--mp-carousel-slide-height')).toBe('300px');
  });

  it('leaves the viewport auto while a slide measures under 10px', async () => {
    const el = await mountSized([0, 300]);
    expect(inner(el).style.getPropertyValue('--mp-carousel-viewport-height')).toBe('');
  });

  it('shows a play/pause button while auto-rotating and toggles paused', async () => {
    const el = await mount(3, { interval: '5000' });
    const button = el.querySelector<HTMLButtonElement>('[data-carousel-toggle]')!;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    const seen: boolean[] = [];
    el.addEventListener('pausedchange', (e) => seen.push((e as CustomEvent<boolean>).detail));
    button.click();
    await settle(el);
    expect(el.paused).toBe(true);
    expect(seen).toEqual([true]);
    expect(el.querySelector('[data-carousel-toggle]')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps a nested carousel to itself', async () => {
    const outer = await mount(2);
    const nested = document.createElement('mp-carousel') as MpCarousel;
    ['a', 'b', 'c'].forEach(() => nested.appendChild(document.createElement('mp-carousel-item')));
    items(outer)[0].appendChild(nested);
    await settle(nested);
    await settle(outer);
    (visiblePair(nested, 0).querySelector('[data-step="next"]') as HTMLElement).click();
    await settle(nested);
    expect(checkedIndex(nested)).toBe(1);
    expect(checkedIndex(outer)).toBe(0);
  });
});
