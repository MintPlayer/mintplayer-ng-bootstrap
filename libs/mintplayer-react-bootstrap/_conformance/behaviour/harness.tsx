import { act } from 'react';
import * as React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect } from 'vitest';

/**
 * Mount/unmount plumbing shared by the behavioural wrapper specs.
 *
 * These specs exist for the half of a hand-written wrapper that nothing else
 * checks: whether a prop becomes the attribute or property the web component
 * actually reads, and whether a custom event reaches the `on*` callback. Both
 * are silent when wrong — the element renders, the page looks right, and the
 * feature is simply inert.
 *
 * They deliberately do NOT re-assert attribute passthrough; that is
 * `attribute-passthrough.spec.tsx`'s job, and its header explains why only
 * `aria-label` is observable under jsdom.
 */

let container: HTMLElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

/** Render a tree and return the container. */
export async function render(node: React.ReactElement): Promise<HTMLElement> {
  await act(async () => {
    root.render(node);
  });
  return container;
}

/**
 * Render and return the first element matching `selector`, failing loudly when
 * it is absent — an assertion on `null.getAttribute` reads as a crash rather
 * than as "the wrapper rendered the wrong tag".
 */
export async function renderEl<T extends Element = HTMLElement>(
  node: React.ReactElement,
  selector: string,
): Promise<T> {
  const host = await render(node);
  const found = host.querySelector<T>(selector);
  expect(found, `no <${selector}> was rendered`).not.toBeNull();
  return found!;
}

/** Dispatch a composed CustomEvent from the element, inside `act`. */
export async function emit(el: Element, type: string, detail?: unknown): Promise<void> {
  await act(async () => {
    el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  });
}
