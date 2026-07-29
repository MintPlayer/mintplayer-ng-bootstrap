import { describe, it, expect, afterEach } from 'vitest';
import { inertRegions } from './inert-regions';
import { deepActiveElement } from './focus-restore';

function cell(id: string): HTMLElement {
  const el = document.createElement('div');
  el.id = id;
  const button = document.createElement('button');
  button.textContent = id;
  el.appendChild(button);
  document.body.appendChild(el);
  return el;
}

function isHidden(el: Element): boolean {
  return el.hasAttribute('inert') && el.getAttribute('aria-hidden') === 'true';
}

function isVisible(el: Element): boolean {
  return !el.hasAttribute('inert') && !el.hasAttribute('aria-hidden');
}

describe('inertRegions', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('writes inert and aria-hidden together so they cannot desync', () => {
    const a = cell('a');
    const regions = inertRegions();

    regions.setHidden([a]);

    expect(isHidden(a)).toBe(true);
  });

  it('treats each declaration as authoritative rather than a delta', () => {
    const [a, b, c] = [cell('a'), cell('b'), cell('c')];
    const regions = inertRegions();

    regions.setHidden([a, b]);
    expect(isHidden(a)).toBe(true);
    expect(isHidden(b)).toBe(true);
    expect(isVisible(c)).toBe(true);

    // Declaring a different set must un-hide what left the set.
    regions.setHidden([c]);
    expect(isVisible(a)).toBe(true);
    expect(isVisible(b)).toBe(true);
    expect(isHidden(c)).toBe(true);
  });

  it('is idempotent', () => {
    const a = cell('a');
    const regions = inertRegions();

    regions.setHidden([a]);
    regions.setHidden([a]);
    regions.setHidden([a]);

    expect(isHidden(a)).toBe(true);
    regions.setHidden([]);
    expect(isVisible(a)).toBe(true);
  });

  it('moves focus out of a region before hiding it', () => {
    // Applying inert to an ancestor of the focused element blurs it to <body>,
    // trading the silent-focus bug for the lost-focus bug.
    const viewport = document.createElement('div');
    viewport.tabIndex = 0;
    document.body.appendChild(viewport);
    const a = document.createElement('div');
    const inner = document.createElement('button');
    a.appendChild(inner);
    viewport.appendChild(a);

    inner.focus();
    expect(deepActiveElement()).toBe(inner);

    inertRegions().setHidden([a]);

    expect(deepActiveElement()).toBe(viewport);
    expect(document.body.contains(inner)).toBe(true);
  });

  it('leaves focus alone when it is outside the hidden region', () => {
    const a = cell('a');
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    inertRegions().setHidden([a]);

    expect(deepActiveElement()).toBe(outside);
  });

  it('un-hides everything while suspended and restores the declared set on resume', () => {
    const [a, b] = [cell('a'), cell('b')];
    const regions = inertRegions();
    regions.setHidden([a, b]);

    regions.suspend();
    // During a transition both the outgoing and incoming region must be
    // reachable, or the animation is interrupted or lands inert.
    expect(isVisible(a)).toBe(true);
    expect(isVisible(b)).toBe(true);

    regions.resume();
    expect(isHidden(a)).toBe(true);
    expect(isHidden(b)).toBe(true);
  });

  it('reference-counts suspend so overlapping transitions do not un-hide early', () => {
    const a = cell('a');
    const regions = inertRegions();
    regions.setHidden([a]);

    regions.suspend();
    regions.suspend();
    regions.resume();

    // Still suspended — one transition is in flight.
    expect(isVisible(a)).toBe(true);

    regions.resume();
    expect(isHidden(a)).toBe(true);
  });

  it('resumes to the last declared state, not to the pre-suspend DOM', () => {
    const [a, b] = [cell('a'), cell('b')];
    const regions = inertRegions();
    regions.setHidden([a]);

    regions.suspend();
    regions.setHidden([b]); // index changed mid-transition
    regions.resume();

    expect(isVisible(a)).toBe(true);
    expect(isHidden(b)).toBe(true);
  });

  it('treats a zero-duration transition as a no-op needing no branch', () => {
    const a = cell('a');
    const regions = inertRegions();
    regions.setHidden([a]);

    // The reduced-motion path collapses to suspend-then-resume with nothing in
    // between; writing the same attributes twice must be harmless.
    regions.suspend();
    regions.resume();

    expect(isHidden(a)).toBe(true);
  });

  it('ignores an unbalanced resume', () => {
    const a = cell('a');
    const regions = inertRegions();
    regions.setHidden([a]);

    regions.resume();

    expect(isHidden(a)).toBe(true);
  });

  it('dispose() clears only what it wrote', () => {
    const [a, b] = [cell('a'), cell('b')];
    b.setAttribute('aria-hidden', 'true'); // pre-existing, author-owned
    const regions = inertRegions();

    regions.setHidden([a]);
    regions.dispose();

    expect(isVisible(a)).toBe(true);
    expect(b.getAttribute('aria-hidden')).toBe('true');
  });

  it('reaches slotted light-DOM content, which a tabindex sweep could not', () => {
    class SlotHost extends HTMLElement {
      cellEl: HTMLElement;
      constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        this.cellEl = document.createElement('div');
        this.cellEl.appendChild(document.createElement('slot'));
        shadow.appendChild(this.cellEl);
      }
    }
    customElements.define('ir-slot-host', SlotHost);

    const host = document.createElement('ir-slot-host') as SlotHost;
    const light = document.createElement('button');
    host.appendChild(light);
    document.body.appendChild(host);

    inertRegions().setHidden([host.cellEl]);

    // The attribute lands on the shadow wrapper; `inert` propagates down the
    // flat tree to the consumer's slotted button. Assert the mechanism is in
    // place — jsdom does not implement inert's focusability effect.
    expect(host.cellEl.hasAttribute('inert')).toBe(true);
    expect(light.assignedSlot).not.toBeNull();
  });
});
