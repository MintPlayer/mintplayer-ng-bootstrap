import { describe, expect, it } from 'vitest';

import BsCarousel from '../../carousel/src/BsCarousel.vue';
import BsNavbar from '../../navbar/src/BsNavbar.vue';
import BsShell from '../../shell/src/BsShell.vue';

import { emit, mountEl } from './harness';

/**
 * Three layout wrappers whose web components read *attributes* rather than
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

describe('BsShell — attribute lowering', () => {
  it('applies the documented defaults', () => {
    const { el } = mountEl(BsShell, 'mp-shell');
    expect(el.getAttribute('state')).toBe('auto');
    expect(el.getAttribute('breakpoint')).toBe('md');
  });

  it('emits neither flag by default', () => {
    const { el } = mountEl(BsShell, 'mp-shell');
    expect(el.hasAttribute('external-toggle')).toBe(false);
    expect(el.hasAttribute('dismiss-on-navigate')).toBe(false);
  });

  it('sets external-toggle as a bare attribute', () => {
    const { el } = mountEl(BsShell, 'mp-shell', { props: { externalToggle: true } });
    expect(el.getAttribute('external-toggle')).toBe('');
  });

  it('sets dismiss-on-navigate as a bare attribute', () => {
    const { el } = mountEl(BsShell, 'mp-shell', { props: { dismissOnNavigate: true } });
    expect(el.getAttribute('dismiss-on-navigate')).toBe('');
  });

  it('forwards an explicit state and size', () => {
    const { el } = mountEl(BsShell, 'mp-shell', { props: { state: 'show', size: '15rem' } });
    expect(el.getAttribute('state')).toBe('show');
    expect(el.getAttribute('size')).toBe('15rem');
  });

  it('re-emits statechange with its detail', async () => {
    const { wrapper, el } = mountEl(BsShell, 'mp-shell');

    await emit(el, 'statechange', { state: 'hide' });

    expect(wrapper.emitted('statechange')![0]).toEqual([{ state: 'hide' }]);
  });

  it('stops emitting once unmounted', () => {
    const { wrapper, el } = mountEl(BsShell, 'mp-shell');
    wrapper.unmount();

    el.dispatchEvent(new CustomEvent('statechange', { detail: { state: 'hide' } }));

    expect(wrapper.emitted('statechange')).toBeUndefined();
  });

  it('projects children into the element', () => {
    const { el } = mountEl(BsShell, 'mp-shell', { slots: { default: () => 'content' } });
    expect(el.textContent).toContain('content');
  });
});

describe('BsNavbar — attribute lowering', () => {
  it('defaults the breakpoint and emits nothing else', () => {
    const { el } = mountEl(BsNavbar, 'mp-navbar');
    expect(el.getAttribute('breakpoint')).toBe('md');
    expect((el as HTMLElement & { expanded: boolean }).expanded).toBe(false);
    expect(el.hasAttribute('color')).toBe(false);
    expect(el.hasAttribute('positioning')).toBe(false);
  });

  /*
   * Asserted on the PROPERTY, and that is the point of the case. The template
   * lowers `expanded` to the attribute shape `''`, but the element defines an
   * `expanded` accessor, and Vue prefers a property over an attribute for any
   * name it finds on the element — so the attribute never appears and the
   * empty string arrives at the setter, where it is falsy. The navbar used to
   * close itself when asked to open. Angular escapes it by binding
   * `[attr.expanded]`, which is why nothing caught this.
   */
  it('opens the collapse when expanded is set', () => {
    const { el } = mountEl<HTMLElement & { expanded: boolean }>(BsNavbar, 'mp-navbar', {
      props: { expanded: true },
    });
    expect(el.expanded).toBe(true);
  });

  it('does not announce a programmatic open as a user toggle', () => {
    const { wrapper } = mountEl(BsNavbar, 'mp-navbar', { props: { expanded: true } });
    expect(wrapper.emitted('expandedchange')).toBeUndefined();
  });

  it('forwards colour and positioning', () => {
    const { el } = mountEl(BsNavbar, 'mp-navbar', {
      props: { color: 'body-tertiary', positioning: 'fixed' },
    });
    expect(el.getAttribute('color')).toBe('body-tertiary');
    expect(el.getAttribute('positioning')).toBe('fixed');
  });

  it('re-emits expandedchange with its detail', async () => {
    const { wrapper, el } = mountEl(BsNavbar, 'mp-navbar');

    await emit(el, 'expandedchange', { expanded: true });

    expect(wrapper.emitted('expandedchange')![0]).toEqual([{ expanded: true }]);
  });

  it('stops emitting once unmounted', () => {
    const { wrapper, el } = mountEl(BsNavbar, 'mp-navbar');
    wrapper.unmount();

    el.dispatchEvent(new CustomEvent('expandedchange', { detail: { expanded: true } }));

    expect(wrapper.emitted('expandedchange')).toBeUndefined();
  });
});
