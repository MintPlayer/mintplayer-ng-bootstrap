import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, expect } from 'vitest';
import { nextTick } from 'vue';

/**
 * Mount/teardown plumbing shared by the behavioural wrapper specs.
 *
 * These cover the half of a Vue wrapper that the static `$attrs` sweep in
 * `attribute-passthrough.spec.ts` cannot see: object-valued props pushed to the
 * custom element as JS *properties* (Vue cannot serialise an array, a Set or a
 * function into an attribute), the `defineModel` write-back that keeps a
 * `v-model` from going stale after the element navigates itself, and the
 * listeners attached in `onMounted` and removed in `onBeforeUnmount`.
 *
 * Every one of those fails silently. A prop that never reaches the element
 * leaves an empty-but-healthy-looking component; a missing write-back leaves a
 * bound value quietly one step behind; a listener attached to the wrong event
 * name simply never fires.
 *
 * **Mounted into the document on purpose.** A custom element upgrades on
 * connection, so a detached mount would leave every `mp-*` root an inert
 * `HTMLElement` and property writes would land on a plain object instead of the
 * element's reactive accessors — passing or failing for the wrong reason.
 */

const open: VueWrapper[] = [];

afterEach(() => {
  // A spec that asserts teardown behaviour unmounts the wrapper itself, so the
  // sweep has to tolerate an already-unmounted one.
  while (open.length) {
    const wrapper = open.pop()!;
    if (wrapper.exists()) wrapper.unmount();
  }
});

/** Mount a wrapper, connected to the document, and track it for teardown. */
export function mountWrapper(
  component: unknown,
  options: Record<string, unknown> = {},
): VueWrapper {
  const wrapper = mount(component as never, { attachTo: document.body, ...options }) as VueWrapper;
  open.push(wrapper);
  return wrapper;
}

/** The `mp-*` custom element a wrapper renders as its root. */
export function elementOf<T extends Element = HTMLElement>(
  wrapper: VueWrapper,
  tag: string,
): T {
  const root = wrapper.element as Element;
  const found = (root.tagName?.toLowerCase() === tag ? root : root.querySelector(tag)) as T | null;
  expect(found, `<${tag}> was not rendered`).not.toBeNull();
  return found!;
}

/** Mount and hand back the element in one step. */
export function mountEl<T extends Element = HTMLElement>(
  component: unknown,
  tag: string,
  options: Record<string, unknown> = {},
): { wrapper: VueWrapper; el: T } {
  const wrapper = mountWrapper(component, options);
  return { wrapper, el: elementOf<T>(wrapper, tag) };
}

/** Dispatch a composed CustomEvent from the element and let Vue settle. */
export async function emit(el: Element, type: string, detail?: unknown): Promise<void> {
  el.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  await nextTick();
}
