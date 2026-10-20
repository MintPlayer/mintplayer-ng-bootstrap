import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';

import BsCarousel from '../../carousel/src/BsCarousel.vue';
import BsShell from '../../shell/src/BsShell.vue';

import { emit, mountEl, mountWrapper } from './harness';

/**
 * Layout wrappers whose web components read *attributes* rather than
 * properties, because their behaviour is a pure-CSS state machine that has to
 * survive SSR and a page with JavaScript switched off.
 *
 * In Vue the lowering is written as `:attr="cond ? '' : undefined"` in the
 * template, and `undefined` is the only value Vue omits — `false` and `null`
 * would render `attr="false"`, which a presence test reads as ON. That single
 * character is the whole risk, and it is invisible in a browser until the
 * no-JS path is exercised.
 *
 * `wrap` and `keyboardEvents` invert it: both default to ON, so the attribute
 * exists only to carry the literal string `"false"` for the opt-out.
 */

describe('BsCarousel — attribute lowering', () => {
  it('emits only the defaulted attributes when nothing is asked for', () => {
    const { el } = mountEl(BsCarousel, 'mp-carousel');
    expect(el.getAttribute('animation')).toBe('slide');
    expect(el.getAttribute('orientation')).toBe('horizontal');
    expect(el.hasAttribute('indicators')).toBe(false);
    expect(el.hasAttribute('interval')).toBe(false);
    expect(el.hasAttribute('wrap')).toBe(false);
    expect(el.hasAttribute('keyboard-events')).toBe(false);
    expect(el.hasAttribute('paused')).toBe(false);
  });

  it('sets indicators as a bare attribute', () => {
    const { el } = mountEl(BsCarousel, 'mp-carousel', { props: { indicators: true } });
    expect(el.getAttribute('indicators')).toBe('');
  });

  it('omits indicators rather than rendering a falsy value', () => {
    const { el } = mountEl(BsCarousel, 'mp-carousel', { props: { indicators: false } });
    expect(el.hasAttribute('indicators')).toBe(false);
  });

  it('forwards a positive interval', () => {
    const { el } = mountEl(BsCarousel, 'mp-carousel', { props: { interval: 4000 } });
    expect(el.getAttribute('interval')).toBe('4000');
  });

  // Zero means "no autoplay", which is the absence of the attribute — an
  // `interval="0"` would arm a zero-delay timer.
  it('drops a zero interval', () => {
    const { el } = mountEl(BsCarousel, 'mp-carousel', { props: { interval: 0 } });
    expect(el.hasAttribute('interval')).toBe(false);
  });

  it('emits the opt-out string for wrap', () => {
    const { el } = mountEl(BsCarousel, 'mp-carousel', { props: { wrap: false } });
    expect(el.getAttribute('wrap')).toBe('false');
  });

  it('emits no wrap attribute at the default', () => {
    const { el } = mountEl(BsCarousel, 'mp-carousel', { props: { wrap: true } });
    expect(el.hasAttribute('wrap')).toBe(false);
  });

  it('hyphenates the keyboard opt-out', () => {
    const { el } = mountEl(BsCarousel, 'mp-carousel', { props: { keyboardEvents: false } });
    expect(el.getAttribute('keyboard-events')).toBe('false');
  });

  it('sets paused from the v-model', () => {
    const { el } = mountEl(BsCarousel, 'mp-carousel', { props: { paused: true } });
    expect(el.getAttribute('paused')).toBe('');
  });

  // The element pauses itself on hover and on the play/pause control, so the
  // binding needs the write-back or it desynchronises on the first hover.
  it('writes a paused-change back to the v-model', async () => {
    const { wrapper, el } = mountEl(BsCarousel, 'mp-carousel', { props: { paused: false } });

    await emit(el, 'paused-change', { paused: true });

    expect(wrapper.emitted('update:paused')![0]).toEqual([true]);
  });

  it.each([
    ['slide-change', 'slideChange', { index: 2 }],
    ['animation-start', 'animationStart', undefined],
    ['animation-end', 'animationEnd', undefined],
  ])('re-emits %s as %s', async (domEvent, vueEvent, detail) => {
    const { wrapper, el } = mountEl(BsCarousel, 'mp-carousel');

    await emit(el, domEvent, detail);

    expect(wrapper.emitted(vueEvent), `${domEvent} never reached ${vueEvent}`).toHaveLength(1);
  });

  it('stops emitting once unmounted', async () => {
    const { wrapper, el } = mountEl(BsCarousel, 'mp-carousel');
    wrapper.unmount();

    el.dispatchEvent(new CustomEvent('slide-change', { detail: { index: 1 } }));

    expect(wrapper.emitted('slideChange')).toBeUndefined();
  });

  // A native custom element needs the slot attribute on a REAL child; Vue's
  // template slot syntax cannot provide one, hence the wrapping span.
  it('wraps a play-pause slot in an element carrying the slot attribute', () => {
    const { el } = mountEl(BsCarousel, 'mp-carousel', {
      slots: { 'play-pause': () => 'Pause' },
    });
    expect(el.querySelector('[slot="play-pause"]')?.textContent).toBe('Pause');
  });

  it('renders no play-pause wrapper when the slot is absent', () => {
    const { el } = mountEl(BsCarousel, 'mp-carousel');
    expect(el.querySelector('[slot="play-pause"]')).toBeNull();
  });
});

// BsShell renders the headless shell itself (#437): its root IS the component
// element, and the props lower onto the core's data attributes and onto which
// native checkbox starts checked.
describe('BsShell — lowering onto the shell markup', () => {
  const mountShell = (options: Record<string, unknown> = {}) => {
    const wrapper = mountWrapper(BsShell, options);
    return { wrapper, el: wrapper.element as HTMLElement };
  };
  const check = (el: HTMLElement, mode: 'narrow' | 'wide') =>
    el.querySelector<HTMLInputElement>(`input.shell-toggle-${mode}`)!;

  it('applies the documented defaults', () => {
    const { el } = mountShell();
    expect(el.matches('div.shell[data-mps=shell]')).toBe(true);
    expect(el.getAttribute('data-breakpoint')).toBe('md');
    expect(el.hasAttribute('data-external-toggle')).toBe(false);
    expect(check(el, 'narrow').checked).toBe(false);
    expect(check(el, 'wide').checked).toBe(true);
  });

  // The sheet tests for attribute PRESENCE, so the value must be the empty string.
  it('sets data-external-toggle as a bare attribute', () => {
    const { el } = mountShell({ props: { externalToggle: true } });
    expect(el.getAttribute('data-external-toggle')).toBe('');
  });

  it('lowers an explicit state and size', () => {
    const { el } = mountShell({ props: { state: 'show', size: '15rem' } });
    expect(check(el, 'narrow').checked).toBe(true);
    expect(el.style.getPropertyValue('--mp-shell-size')).toBe('15rem');
  });

  it('emits statechange as { open } when a toggle flips', async () => {
    const { wrapper, el } = mountShell();

    check(el, 'wide').click();
    await nextTick();

    expect(wrapper.emitted('statechange')![0]).toEqual([{ open: false }]);
  });

  it('renders the named slots into their regions', () => {
    const { el } = mountShell({
      slots: { topbar: () => 'brand', sidebar: () => 'links', default: () => 'content' },
    });
    expect(el.querySelector('.topbar')?.textContent).toContain('brand');
    expect(el.querySelector('aside.sidebar')?.textContent).toContain('links');
    expect(el.querySelector('.content')?.textContent).toContain('content');
  });
});
