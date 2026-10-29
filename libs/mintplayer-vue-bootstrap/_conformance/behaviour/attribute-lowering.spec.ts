import { describe, expect, it } from 'vitest';
import { h, nextTick } from 'vue';

import { BsCarousel, BsCarouselItem } from '@mintplayer/vue-bootstrap/carousel';
import BsShell from '../../shell/src/BsShell.vue';

import { mountEl, mountWrapper } from './harness';

/**
 * How each component lowers its props onto the markup the headless core
 * renders. The layout is a CSS state machine that survives SSR and a page with
 * JavaScript switched off, so only what is serialised into the HTML counts.
 */

// BsCarousel renders the headless carousel itself (#437): the server render
// needs one radio, indicator and control pair per slide BEFORE the slides, so
// the count comes from the default slot's vnodes (the Vue extension).
describe('BsCarousel — markup from the headless core', () => {
  const slides = (n: number) => () =>
    Array.from({ length: n }, (_, i) => h(BsCarouselItem, { key: i }, () => h('img', { alt: `Slide ${i}` })));

  it('renders a radio, a control pair and an indicator per declared slide', () => {
    const { el } = mountEl(BsCarousel, 'div.carousel', {
      props: { indicators: true },
      attrs: { 'aria-label': 'Photos' },
      slots: { default: slides(3) },
    });
    expect(el.getAttribute('role')).toBe('region');
    expect(el.getAttribute('aria-label')).toBe('Photos');
    expect(el.querySelectorAll(':scope > input.car-radio')).toHaveLength(3);
    expect(el.querySelectorAll(':scope > .carousel-controls > .carousel-control-pair')).toHaveLength(3);
    expect(el.querySelectorAll(':scope > .carousel-indicators > [data-bs-target]')).toHaveLength(3);
    expect(el.querySelectorAll('.carousel-item')).toHaveLength(3);
  });

  it('starts on the first slide and renders no indicators unless asked', () => {
    const { el } = mountEl(BsCarousel, 'div.carousel', { slots: { default: slides(2) } });
    const radios = el.querySelectorAll<HTMLInputElement>(':scope > input.car-radio');
    expect([...radios].map((r) => r.checked)).toEqual([true, false]);
    expect(el.querySelector(':scope > .carousel-indicators')).toBeNull();
  });

  it('lowers animation and orientation onto data attributes', () => {
    const { el } = mountEl(BsCarousel, 'div.carousel', {
      props: { animation: 'fade', orientation: 'vertical' },
      slots: { default: slides(1) },
    });
    expect(el.getAttribute('data-animation')).toBe('fade');
    expect(el.getAttribute('data-orientation')).toBe('vertical');
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
