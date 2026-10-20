# @mintplayer/ui-core

Headless, framework-neutral cores for the `@mintplayer/*-bootstrap` component libraries.

A core owns everything about a component except its markup: state, transitions, keyboard
intent, async request lifecycles, the ARIA attribute bags each node must carry, and the
component's scoped stylesheet. Four fronts consume a core and render their own template from
it: an Angular component, a React component, a Vue single-file component and a Lit web
component. Because the Angular front renders an Angular template, Angular SSR emits real,
data-filled HTML for every component, with no custom element in the way.

Entries:

- `@mintplayer/ui-core/store` — `Machine<S>`: immutable snapshot, `subscribe`, batched
  notifications. Every core extends it; every front bridges it to its own reactivity.
- `@mintplayer/ui-core/async` — `SupersedingRequest`: debounce, abort-previous, stale-drop.
  One lifecycle for every type-to-search component.
- `@mintplayer/ui-core/typeahead` — the first core (pilot of the architecture, #436).

Pilot PRD: `docs/prd/typeahead-wc-436.md`. Catalog migration: issue #437.
