import { describe, expect, it } from 'vitest';
import {
  CAROUSEL_LABELS,
  carouselLabel,
  carouselRadioId,
  connectCarousel,
  connectCarouselItem,
  parseAnimation,
  parseOrientation,
  type CarouselOptions,
} from './carousel';

const base: CarouselOptions = {
  id: 'c1',
  count: 3,
  index: 0,
  animation: 'slide',
  orientation: 'horizontal',
  indicators: true,
  keyboardEvents: true,
  interval: 0,
  paused: false,
  reducedMotion: false,
  animating: false,
  hydrated: false,
  label: 'Photos',
  labels: CAROUSEL_LABELS,
};

const view = (patch: Partial<CarouselOptions> = {}) => connectCarousel({ ...base, ...patch });

describe('connectCarousel', () => {
  it('names the region and exposes the APG carousel role description', () => {
    const { root } = view();
    expect(root).toMatchObject({ class: 'carousel', role: 'region', 'aria-roledescription': 'carousel', 'aria-label': 'Photos' });
    expect(root['data-mps']).toBeUndefined();
  });

  it('renders one radio per slide in one group, the index checked', () => {
    const { radios } = view({ index: 1 });
    expect(radios.map((r) => r.bag['id'])).toEqual(['c1-s0', 'c1-s1', 'c1-s2']);
    expect(new Set(radios.map((r) => r.bag['name']))).toEqual(new Set(['c1']));
    expect(radios.map((r) => r.bag['checked'])).toEqual([false, true, false]);
    expect(radios[2].bag['aria-label']).toBe('Slide 3');
  });

  it('points each control pair at the wrapped neighbours, so no-JS navigation wraps', () => {
    const { controls } = view();
    expect(controls.pairs.map((p) => [p.prev['for'], p.next['for']])).toEqual([
      ['c1-s2', 'c1-s1'],
      ['c1-s0', 'c1-s2'],
      ['c1-s1', 'c1-s0'],
    ]);
    expect(controls.pairs[0].prev).toMatchObject({ role: 'button', 'data-step': 'previous', 'aria-label': 'Previous' });
  });

  it('keeps the server render inert: no tab stops, no live region, no play/pause', () => {
    const v = view({ interval: 3000 });
    expect(v.inner['tabindex']).toBeNull();
    expect(v.inner['aria-live']).toBeNull();
    expect(v.controls.pairs[0].next['tabindex']).toBeNull();
    expect(v.playPause).toBeNull();
    expect(v.indicators!.items[0].bag['aria-current']).toBeNull();
    expect(v.root['data-mp-hydrated']).toBeNull();
  });

  it('goes live once hydrated: focusable viewport, key shortcuts, current indicator', () => {
    const v = view({ hydrated: true, index: 2 });
    expect(v.root['data-mp-hydrated']).toBe(true);
    expect(v.inner).toMatchObject({ tabindex: 0, 'aria-live': 'polite', 'aria-keyshortcuts': 'ArrowLeft ArrowRight Home End' });
    expect(v.indicators!.items.map((i) => i.bag['aria-current'])).toEqual([null, null, 'true']);
    expect(view({ hydrated: true, orientation: 'vertical' }).inner['aria-keyshortcuts']).toBe('ArrowUp ArrowDown Home End');
    expect(view({ hydrated: true, keyboardEvents: false }).inner['aria-keyshortcuts']).toBeNull();
  });

  it('silences the live region while rotating, and announces once paused (APG)', () => {
    expect(view({ hydrated: true, interval: 3000 }).inner['aria-live']).toBe('off');
    expect(view({ hydrated: true, interval: 3000, paused: true }).inner['aria-live']).toBe('polite');
    expect(view({ hydrated: true, interval: 3000, reducedMotion: true }).inner['aria-live']).toBe('polite');
  });

  it('labels the play/pause button by the action it performs', () => {
    const playing = view({ hydrated: true, interval: 3000 }).playPause!;
    expect(playing.button).toMatchObject({ type: 'button', 'aria-pressed': 'false', 'aria-label': 'Stop automatic slide show' });
    const paused = view({ hydrated: true, interval: 3000, paused: true }).playPause!;
    expect(paused.button).toMatchObject({ 'aria-pressed': 'true', 'aria-label': 'Start automatic slide show' });
  });

  it('renders no indicators unless asked, and nothing per slide for an empty deck', () => {
    expect(view({ indicators: false }).indicators).toBeNull();
    const empty = view({ count: 0 });
    expect(empty.radios).toEqual([]);
    expect(empty.controls.pairs).toEqual([]);
  });

  it('marks the busy viewport during a transition', () => {
    expect(view({ hydrated: true, animating: true }).inner['aria-busy']).toBe('true');
    expect(view({ hydrated: true }).inner['aria-busy']).toBeNull();
  });
});

describe('connectCarouselItem', () => {
  it('is a group with the slide role description', () => {
    const { root } = connectCarouselItem({ labels: CAROUSEL_LABELS });
    expect(root).toMatchObject({ class: 'carousel-item', role: 'group', 'aria-roledescription': 'slide' });
  });
});

describe('helpers', () => {
  it('fills label templates and leaves unknown placeholders alone', () => {
    expect(carouselLabel('${n} of ${count}', { n: 2, count: 5 })).toBe('2 of 5');
    expect(carouselLabel('${x}', {})).toBe('${x}');
  });

  it('parses animation and orientation with safe defaults', () => {
    expect(parseAnimation('fade')).toBe('fade');
    expect(parseAnimation('none')).toBe('none');
    expect(parseAnimation('bogus')).toBe('slide');
    expect(parseOrientation('vertical')).toBe('vertical');
    expect(parseOrientation(undefined)).toBe('horizontal');
  });

  it('derives radio ids from the root id', () => {
    expect(carouselRadioId('x', 4)).toBe('x-s4');
  });
});
