import * as React from 'react';
import { describe, expect, it } from 'vitest';

import { BsCarousel } from '@mintplayer/react-bootstrap/carousel';
import { BsDropdownMenu } from '@mintplayer/react-bootstrap/dropdown-menu';
import { BsNavbar, BsNavbarItem } from '@mintplayer/react-bootstrap/navbar';
import { BsShell } from '@mintplayer/react-bootstrap/shell';

import { emit, renderEl } from './harness';

/**
 * Four wrappers exist for one reason each: to turn an idiomatic React prop into
 * the *attribute* shape the web component reads. They read attributes rather
 * than properties deliberately — the layout is a pure-CSS state machine so it
 * survives SSR and a JS-disabled page, and only an attribute is serialised into
 * the HTML.
 *
 * That makes the mapping load-bearing and invisible when wrong: a boolean
 * forwarded as `false` instead of being omitted still renders a working-looking
 * component whose CSS never matches, and a camelCase prop that never gets
 * hyphenated is simply ignored.
 *
 * The negative cases matter as much as the positive ones. `wrap` and
 * `keyboardEvents` default to ON, so the wrapper must emit an attribute only
 * for the explicit `false` — emitting `wrap="true"` would be equally wrong,
 * because the WC tests for the string `"false"`.
 */

describe('BsCarousel — conditional attribute mapping', () => {
  it('emits nothing for a bare carousel', async () => {
    const el = await renderEl(<BsCarousel />, 'mp-carousel');
    expect(el.hasAttribute('indicators')).toBe(false);
    expect(el.hasAttribute('interval')).toBe(false);
    expect(el.hasAttribute('wrap')).toBe(false);
    expect(el.hasAttribute('keyboard-events')).toBe(false);
    expect(el.hasAttribute('paused')).toBe(false);
  });

  it('sets indicators when asked', async () => {
    const el = await renderEl(<BsCarousel indicators />, 'mp-carousel');
    expect(el.hasAttribute('indicators')).toBe(true);
  });

  it('sets a positive interval', async () => {
    const el = await renderEl(<BsCarousel interval={3000} />, 'mp-carousel');
    expect(el.getAttribute('interval')).toBe('3000');
  });

  // Zero means "no autoplay", which is the absence of the attribute — passing
  // `interval="0"` would start a zero-delay timer.
  it('drops an interval of zero rather than forwarding it', async () => {
    const el = await renderEl(<BsCarousel interval={0} />, 'mp-carousel');
    expect(el.hasAttribute('interval')).toBe(false);
  });

  it('drops a negative interval', async () => {
    const el = await renderEl(<BsCarousel interval={-1} />, 'mp-carousel');
    expect(el.hasAttribute('interval')).toBe(false);
  });

  it('opts out of wrapping with the literal string the WC tests for', async () => {
    const el = await renderEl(<BsCarousel wrap={false} />, 'mp-carousel');
    expect(el.getAttribute('wrap')).toBe('false');
  });

  it('emits no wrap attribute when wrapping is on', async () => {
    const el = await renderEl(<BsCarousel wrap />, 'mp-carousel');
    expect(el.hasAttribute('wrap')).toBe(false);
  });

  it('opts out of keyboard navigation through the hyphenated attribute', async () => {
    const el = await renderEl(<BsCarousel keyboardEvents={false} />, 'mp-carousel');
    expect(el.getAttribute('keyboard-events')).toBe('false');
    expect(el.hasAttribute('keyboardEvents')).toBe(false);
  });

  it('sets paused only while paused', async () => {
    expect((await renderEl(<BsCarousel paused />, 'mp-carousel')).hasAttribute('paused')).toBe(true);
    expect(
      (await renderEl(<BsCarousel paused={false} />, 'mp-carousel')).hasAttribute('paused'),
    ).toBe(false);
  });

  it('forwards animation and orientation straight through', async () => {
    const el = await renderEl(<BsCarousel animation="fade" orientation="vertical" />, 'mp-carousel');
    expect(el.getAttribute('animation')).toBe('fade');
    expect(el.getAttribute('orientation')).toBe('vertical');
  });

  it.each([
    ['slide-change', 'onSlideChange'],
    ['paused-change', 'onPausedChange'],
    ['animation-start', 'onAnimationStart'],
    ['animation-end', 'onAnimationEnd'],
  ])('routes %s to %s', async (event, prop) => {
    const seen: CustomEvent[] = [];
    const el = await renderEl(
      React.createElement(BsCarousel, { [prop]: (e: CustomEvent) => seen.push(e) }),
      'mp-carousel',
    );

    await emit(el, event, { probe: event });

    expect(seen).toHaveLength(1);
    expect(seen[0].detail).toEqual({ probe: event });
  });
});

describe('BsShell — conditional attribute mapping', () => {
  it('emits neither flag by default', async () => {
    const el = await renderEl(<BsShell />, 'mp-shell');
    expect(el.hasAttribute('external-toggle')).toBe(false);
    expect(el.hasAttribute('dismiss-on-navigate')).toBe(false);
  });

  // The WC tests for attribute PRESENCE, so the value must be the empty string
  // — `external-toggle="true"` works by accident and `="false"` would not.
  it('sets external-toggle as a bare attribute', async () => {
    const el = await renderEl(<BsShell externalToggle />, 'mp-shell');
    expect(el.getAttribute('external-toggle')).toBe('');
  });

  it('sets dismiss-on-navigate as a bare attribute', async () => {
    const el = await renderEl(<BsShell dismissOnNavigate />, 'mp-shell');
    expect(el.getAttribute('dismiss-on-navigate')).toBe('');
  });

  it('forwards state, breakpoint and size as attributes', async () => {
    const el = await renderEl(<BsShell state="show" breakpoint="lg" size="15rem" />, 'mp-shell');
    expect(el.getAttribute('state')).toBe('show');
    expect(el.getAttribute('breakpoint')).toBe('lg');
    expect(el.getAttribute('size')).toBe('15rem');
  });

  it('routes statechange to onStatechange', async () => {
    const seen: CustomEvent[] = [];
    const el = await renderEl(<BsShell onStatechange={(e) => seen.push(e)} />, 'mp-shell');

    await emit(el, 'statechange', { state: 'show' });

    expect(seen).toHaveLength(1);
    expect(seen[0].detail).toEqual({ state: 'show' });
  });
});

describe('BsDropdownMenu — conditional attribute mapping', () => {
  it('omits max-height when there is no cap', async () => {
    const el = await renderEl(<BsDropdownMenu />, 'mp-dropdown-menu');
    expect(el.hasAttribute('max-height')).toBe(false);
  });

  it('hyphenates maxHeight', async () => {
    const el = await renderEl(<BsDropdownMenu maxHeight={240} />, 'mp-dropdown-menu');
    expect(el.getAttribute('max-height')).toBe('240');
    expect(el.hasAttribute('maxHeight')).toBe(false);
  });

  // `!= null` rather than truthiness: zero is a legitimate cap and must not be
  // silently dropped the way an unset value is.
  it('forwards a cap of zero', async () => {
    const el = await renderEl(<BsDropdownMenu maxHeight={0} />, 'mp-dropdown-menu');
    expect(el.getAttribute('max-height')).toBe('0');
  });

  it('forwards mode', async () => {
    const el = await renderEl(<BsDropdownMenu mode="listbox" />, 'mp-dropdown-menu');
    expect(el.getAttribute('mode')).toBe('listbox');
  });

  // Renamed on purpose: React's own `onSelect` is a text-selection event, so
  // the WC's item-selection event takes the name and the native one is dropped
  // from the props type.
  it('routes the WC select event to onSelect', async () => {
    const seen: CustomEvent[] = [];
    const el = await renderEl(
      <BsDropdownMenu onSelect={(e) => seen.push(e)} />,
      'mp-dropdown-menu',
    );

    await emit(el, 'select', { value: 'a' });

    expect(seen).toHaveLength(1);
    expect(seen[0].detail).toEqual({ value: 'a' });
  });
});

describe('BsNavbar — conditional attribute mapping', () => {
  it('leaves the navbar collapsed by default', async () => {
    const el = await renderEl<HTMLElement & { expanded: boolean }>(<BsNavbar />, 'mp-navbar');
    expect(el.expanded).toBe(false);
  });

  /*
   * Asserted on the PROPERTY rather than the attribute, and that is the whole
   * point of this case. The wrapper lowers `expanded` to the attribute shape
   * `''` — but `expanded` is an accessor on the element's prototype, so
   * `@lit/react` (and Vue) route it through the property instead, and the
   * attribute never appears. `''` is falsy in JavaScript, so the navbar used to
   * close itself when asked to open. Angular is unaffected because it binds
   * `[attr.expanded]`, which is exactly why nothing caught this for so long.
   */
  it('opens the collapse when expanded is set', async () => {
    const el = await renderEl<HTMLElement & { expanded: boolean }>(<BsNavbar expanded />, 'mp-navbar');
    expect(el.expanded).toBe(true);
  });

  it('does not announce a programmatic open as a user toggle', async () => {
    const seen: CustomEvent[] = [];
    await renderEl(<BsNavbar expanded onExpandedChange={(e) => seen.push(e)} />, 'mp-navbar');
    expect(seen).toHaveLength(0);
  });

  it('forwards breakpoint, color and positioning', async () => {
    const el = await renderEl(
      <BsNavbar breakpoint="lg" color="body-tertiary" positioning="fixed" />,
      'mp-navbar',
    );
    expect(el.getAttribute('breakpoint')).toBe('lg');
    expect(el.getAttribute('color')).toBe('body-tertiary');
    expect(el.getAttribute('positioning')).toBe('fixed');
  });

  it('routes expandedchange to onExpandedChange', async () => {
    const seen: CustomEvent[] = [];
    const el = await renderEl(<BsNavbar onExpandedChange={(e) => seen.push(e)} />, 'mp-navbar');

    await emit(el, 'expandedchange', { expanded: true });

    expect(seen).toHaveLength(1);
    expect(seen[0].detail).toEqual({ expanded: true });
  });
});

describe('BsNavbarItem — conditional attribute mapping', () => {
  it('emits neither flag by default', async () => {
    const el = await renderEl(<BsNavbarItem />, 'mp-navbar-item');
    expect(el.hasAttribute('active')).toBe(false);
    expect(el.hasAttribute('disabled')).toBe(false);
  });

  it('marks the current page', async () => {
    const el = await renderEl(<BsNavbarItem active />, 'mp-navbar-item');
    expect(el.getAttribute('active')).toBe('');
  });

  it('marks a disabled entry', async () => {
    const el = await renderEl(<BsNavbarItem disabled />, 'mp-navbar-item');
    expect(el.getAttribute('disabled')).toBe('');
  });

  // The item is deliberately transparent: the link stays in light DOM so it
  // navigates with no JavaScript at all.
  it('keeps a slotted link in the light DOM', async () => {
    const el = await renderEl(
      <BsNavbarItem>
        <a href="/home">Home</a>
      </BsNavbarItem>,
      'mp-navbar-item',
    );
    expect(el.querySelector('a')?.getAttribute('href')).toBe('/home');
  });

  it('places the item in the requested navbar slot', async () => {
    const el = await renderEl(<BsNavbarItem slot="end" />, 'mp-navbar-item');
    expect(el.getAttribute('slot')).toBe('end');
  });
});
