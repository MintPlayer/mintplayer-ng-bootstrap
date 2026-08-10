import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';

import BsCheckbox from '../checkbox/src/BsCheckbox.vue';
import BsHierarchyChart from '../charts/hierarchy/src/BsHierarchyChart.vue';
import BsDropdownMenu from '../dropdown-menu/src/BsDropdownMenu.vue';
import BsNavbar from '../navbar/src/BsNavbar.vue';
import BsTimeline from '../timeline/src/BsTimeline.vue';

/**
 * The Vue half of the wrapper-transparency guard (Angular:
 * `mintplayer-ng-bootstrap/_conformance/aria-passthrough.spec.ts`, React:
 * `mintplayer-react-bootstrap/_conformance/attribute-passthrough.spec.tsx`).
 *
 * Vue is the framework where transparency holds **by construction**: a
 * non-prop attribute lands on the single root element automatically, and every
 * wrapper that opts out with `inheritAttrs: false` re-binds `v-bind="$attrs"` on
 * its `mp-*` root. The audit measured 47/48 correct, and the 48th (the navbar
 * `ariaLabel` ordering concern) was disproven by a spike — Vue normalises
 * kebab-case attributes onto declared camelCase props, so a same-named prop and
 * attribute are one channel, not two.
 *
 * Because the mechanism is uniform, the guard checks the INVARIANT rather than
 * mounting all 47 wrappers with their required props:
 *
 *  1. Statically: every SFC that declares `inheritAttrs: false` must contain
 *     `v-bind="$attrs"`. Forgetting either half is the only way a Vue wrapper
 *     can silently stop forwarding, and a new wrapper that forgets fails here.
 *  2. At runtime: five representative wrappers (form control, list composite,
 *     landmark, data composite, namespaced chart) prove the pattern end-to-end in
 *     jsdom, using `aria-label` — hyphenated, so it can never be captured by a
 *     declared prop.
 */

// Vite resolves the globs at transform time; `query: '?raw'` keeps the SFC as text.
// Both depths are swept: `<entry>/src/*.vue` and the namespaced
// `<namespace>/<entry>/src/*.vue` (charts/), or a whole namespace would opt out
// of the invariant below by being invisible to it.
const SFC_SOURCES = {
  ...(import.meta.glob('../*/src/*.vue', { query: '?raw', import: 'default', eager: true }) as Record<string, string>),
  ...(import.meta.glob('../*/*/src/*.vue', { query: '?raw', import: 'default', eager: true }) as Record<string, string>),
};

describe('Vue wrapper attribute passthrough — the invariant, statically', () => {
  it('found the wrapper sources at all', () => {
    // Guards the glob itself: a path change that silences the sweep must fail
    // loudly, not pass an empty loop.
    expect(Object.keys(SFC_SOURCES).length).toBeGreaterThanOrEqual(40);
  });

  it('every inheritAttrs:false wrapper re-binds v-bind="$attrs"', () => {
    const offenders = Object.entries(SFC_SOURCES)
      .filter(([, source]) => source.includes('inheritAttrs: false'))
      .filter(([, source]) => !source.includes('v-bind="$attrs"'))
      .map(([path]) => path);

    expect(offenders, 'these SFCs opt out of automatic forwarding and forward nothing').toEqual([]);
  });
});

describe('Vue wrapper attribute passthrough — representatives, at runtime', () => {
  const CASES = [
    { name: 'BsCheckbox', component: BsCheckbox, tag: 'mp-checkbox' },
    { name: 'BsDropdownMenu', component: BsDropdownMenu, tag: 'mp-dropdown-menu' },
    { name: 'BsNavbar', component: BsNavbar, tag: 'mp-navbar' },
    { name: 'BsTimeline', component: BsTimeline, tag: 'mp-timeline' },
    // Namespaced entry (charts/) — also proves the two-level glob above finds them.
    { name: 'BsHierarchyChart', component: BsHierarchyChart, tag: 'mp-hierarchy-chart' },
  ];

  it.each(CASES)('$name forwards a consumer attribute to its $tag root', ({ component, tag }) => {
    const wrapper = mount(component as never, {
      attrs: { 'aria-label': 'probe-name', 'data-probe': 'x' },
    });

    const target = wrapper.element.tagName.toLowerCase() === tag
      ? wrapper.element
      : wrapper.element.querySelector(tag);

    expect(target, `${tag} root not rendered`).not.toBeNull();
    expect(target!.getAttribute('aria-label')).toBe('probe-name');
    expect(target!.getAttribute('data-probe')).toBe('x');
  });
});
