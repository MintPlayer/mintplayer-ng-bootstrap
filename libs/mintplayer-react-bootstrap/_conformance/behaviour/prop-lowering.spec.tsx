import * as React from 'react';
import { act } from 'react';
import { describe, expect, it } from 'vitest';

import { BsCarousel } from '@mintplayer/react-bootstrap/carousel';
import { BsDropdownMenu } from '@mintplayer/react-bootstrap/dropdown-menu';
import { BsNavbar, BsNavbarDropdown, BsNavbarItem } from '@mintplayer/react-bootstrap/navbar';
import { BsShell } from '@mintplayer/react-bootstrap/shell';

import { renderEl } from './harness';

/**
 * These wrappers exist for one reason each: to turn an idiomatic React prop into
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

// BsShell renders the headless shell itself (#437): the props lower onto the
// core's data attributes and onto which native checkbox starts checked.
describe('BsShell — lowering onto the shell markup', () => {
  it('emits no external-toggle flag by default', async () => {
    const el = await renderEl(<BsShell />, 'div.shell');
    expect(el.hasAttribute('data-external-toggle')).toBe(false);
    expect(el.getAttribute('data-breakpoint')).toBe('md');
  });

  // The sheet tests for attribute PRESENCE, so the value must be the empty string.
  it('sets data-external-toggle as a bare attribute', async () => {
    const el = await renderEl(<BsShell externalToggle />, 'div.shell');
    expect(el.getAttribute('data-external-toggle')).toBe('');
  });

  it('lowers breakpoint and size', async () => {
    const el = await renderEl(<BsShell breakpoint="lg" size="15rem" />, 'div.shell');
    expect(el.getAttribute('data-breakpoint')).toBe('lg');
    expect(el.style.getPropertyValue('--mp-shell-size')).toBe('15rem');
  });

  it('lowers state onto the initial checks (checked means revealed)', async () => {
    const auto = await renderEl(<BsShell />, 'div.shell');
    expect(auto.querySelector<HTMLInputElement>('input.shell-toggle-narrow')?.checked).toBe(false);
    expect(auto.querySelector<HTMLInputElement>('input.shell-toggle-wide')?.checked).toBe(true);

    const show = await renderEl(<BsShell state="show" />, 'div.shell');
    expect(show.querySelector<HTMLInputElement>('input.shell-toggle-narrow')?.checked).toBe(true);
    expect(show.querySelector<HTMLInputElement>('input.shell-toggle-wide')?.checked).toBe(true);
  });

  it('routes a toggle flip to onStatechange as { open }', async () => {
    const seen: { open: boolean }[] = [];
    const el = await renderEl(<BsShell onStatechange={(change) => seen.push(change)} />, 'div.shell');

    await act(async () => {
      el.querySelector<HTMLInputElement>('input.shell-toggle-wide')?.click();
    });

    expect(seen).toEqual([{ open: false }]);
  });
});

describe('BsDropdownMenu — markup from the headless core', () => {
  it('renders the scoped .dropdown-menu list with no height cap by default', async () => {
    const ul = await renderEl(<BsDropdownMenu />, 'ul');
    expect(ul.classList).toContain('dropdown-menu');
    expect(ul.getAttribute('data-mps')).toBe('dropdown-menu');
    expect(ul.style.getPropertyValue('--mp-dropdown-max-height')).toBe('');
  });

  // Zero is a legitimate cap and must not be dropped the way an unset value is.
  it('writes maxHeight as the height-cap custom property, zero included', async () => {
    const capped = await renderEl(<BsDropdownMenu maxHeight={240} />, 'ul');
    expect(capped.style.getPropertyValue('--mp-dropdown-max-height')).toBe('240px');
    const zero = await renderEl(<BsDropdownMenu maxHeight={0} />, 'ul');
    expect(zero.style.getPropertyValue('--mp-dropdown-max-height')).toBe('0px');
  });

  // Renamed on purpose: React's own `onSelect` is a text-selection event, so
  // the menu's item selection takes the name and the native one is dropped
  // from the props type.
  it('reports an item activation to onSelect', async () => {
    const seen: unknown[] = [];
    const ul = await renderEl(
      <BsDropdownMenu onSelect={({ value }) => seen.push(value)}>
        <li className="dropdown-item" data-value="a">A</li>
      </BsDropdownMenu>,
      'ul',
    );

    await act(async () => {
      ul.querySelector<HTMLElement>('li')!.click();
    });

    expect(seen).toEqual(['a']);
  });
});

describe('BsNavbar — markup from the headless core', () => {
  const toggle = (nav: Element) => nav.querySelector<HTMLInputElement>('input.navbar-toggle')!;

  it('renders a collapsed navigation landmark by default', async () => {
    const nav = await renderEl(<BsNavbar />, 'nav');
    expect(nav.classList).toContain('navbar');
    expect(nav.getAttribute('aria-label')).toBe('Main navigation');
    expect(toggle(nav).checked).toBe(false);
    expect(toggle(nav).getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the collapse when expanded is set', async () => {
    const nav = await renderEl(<BsNavbar expanded />, 'nav');
    expect(toggle(nav).checked).toBe(true);
    expect(toggle(nav).getAttribute('aria-expanded')).toBe('true');
  });

  it('does not announce a programmatic open as a user toggle', async () => {
    const seen: unknown[] = [];
    await renderEl(<BsNavbar expanded onExpandedChange={(d) => seen.push(d)} />, 'nav');
    expect(seen).toHaveLength(0);
  });

  it('maps breakpoint, color and positioning onto Bootstrap classes', async () => {
    const nav = await renderEl(<BsNavbar breakpoint="lg" color="body-tertiary" positioning="fixed" />, 'nav');
    expect([...nav.classList]).toEqual(expect.arrayContaining(['navbar-expand-lg', 'bg-body-tertiary', 'fixed-top']));
    expect(nav.getAttribute('data-breakpoint')).toBe('lg');
  });

  it('reports a toggle of the checkbox to onExpandedChange', async () => {
    const seen: unknown[] = [];
    const nav = await renderEl(<BsNavbar onExpandedChange={(d) => seen.push(d)} />, 'nav');

    await act(async () => {
      toggle(nav).click();
    });

    expect(seen).toEqual([{ expanded: true }]);
    expect(toggle(nav).getAttribute('aria-expanded')).toBe('true');
  });

  it('renders the brand prop in .navbar-brand', async () => {
    const nav = await renderEl(<BsNavbar brand={<a href="/">Brand</a>} />, 'nav');
    expect(nav.querySelector('.navbar-brand > a')?.getAttribute('href')).toBe('/');
  });
});

describe('BsNavbarItem — markup from the headless core', () => {
  it('is a plain nav-item around its link by default', async () => {
    const item = await renderEl(
      <BsNavbarItem>
        <a href="/home">Home</a>
      </BsNavbarItem>,
      'div',
    );
    expect(item.className).toBe('nav-item');
    expect(item.hasAttribute('aria-current')).toBe(false);
    expect(item.querySelector('a')?.getAttribute('href')).toBe('/home');
  });

  it('marks the current page and a disabled entry', async () => {
    const item = await renderEl(<BsNavbarItem active disabled />, 'div');
    expect([...item.classList]).toEqual(['nav-item', 'active', 'disabled']);
    expect(item.getAttribute('aria-current')).toBe('page');
    expect(item.getAttribute('aria-disabled')).toBe('true');
  });

  it('becomes a dropdown item inside a BsNavbarDropdown', async () => {
    const details = await renderEl(
      <BsNavbarDropdown label="More">
        <BsNavbarItem active>
          <a href="/x">X</a>
        </BsNavbarItem>
      </BsNavbarDropdown>,
      'details',
    );
    const item = details.querySelector('.dropdown-menu > div')!;
    expect([...item.classList]).toEqual(['dropdown-item', 'active']);
    expect(item.getAttribute('aria-current')).toBe('true');
    expect(details.getAttribute('name')).toBe('mp-navbar-0');
  });
});
