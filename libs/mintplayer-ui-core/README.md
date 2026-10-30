# @mintplayer/ui-core

Headless, framework-neutral cores for the `@mintplayer/*-bootstrap` component libraries.

A core owns everything about a component except its markup: state, transitions, keyboard
intent, async request lifecycles, the ARIA attribute bags each node must carry, and the
component's scoped stylesheet. Four fronts consume a core and render their own template from
it: an Angular component (`@mintplayer/ng-bootstrap`), a React component
(`@mintplayer/react-bootstrap`), a Vue single-file component (`@mintplayer/vue-bootstrap`) and a
Lit web component (`@mintplayer/web-components`). Because every front renders real HTML, server
rendering emits data-filled markup for every component, with no custom element in the way.

Most components are written once here, as a core, a `.view.vue` template and a manifest, and the
component compiler (`libs/mintplayer-component-compiler`) generates the four fronts from them.

## The Bootstrap baseline

`@mintplayer/ui-core/styles/bootstrap` (SCSS) or the prebuilt `styles/bootstrap.css` is the
page-level Bootstrap every component relies on. Load it once per page, before any component sheet:

- Angular: `@use '@mintplayer/ng-bootstrap/bootstrap';` forwards it.
- React, Vue, plain web components: `@use '@mintplayer/ui-core/styles/bootstrap';`, or link the CSS.

It is all of Bootstrap 5.3 in `@layer mp.bootstrap`, below the components (`@layer mp.components`).
Your own unlayered CSS beats both, so theming needs no `!important`. Dark mode is page-level:
`data-bs-theme` on `<html>`.

Every Bootstrap class is present (a conformance spec compares the compiled sheet with stock
Bootstrap). On top of it, the baseline adds:

| Classes | Values |
|---|---|
| `.cursor-*` | `auto default pointer wait text move help not-allowed grab grabbing`, and the eight `*-resize` directions (`n-resize`, `ne-resize`, ...) |
| `.white-space-*` | `break-spaces none normal nowrap pre pre-line pre-wrap revert` (Bootstrap's `.text-wrap` / `.text-nowrap` are there too) |
| `.overflow-x-*` | `clip overlay revert unset`, next to Bootstrap's `auto hidden visible scroll` |
| `.w-{sm,md,lg,xl,xxl}-{25,50,75,100,auto}` | Bootstrap's width utilities, made responsive |

## Entries

Infrastructure the cores and fronts share:

- `component`: `defineCore` and the runtime every front hosts a core with.
- `store`: `Machine<S>`, an immutable snapshot with `subscribe` and batched notifications.
- `async`: `SupersedingRequest` (debounce, abort the previous request, drop stale answers).
- `transfer-state`: the SSR seed (`runPrefetch`, `serializeTransferState`, canonical JSON keys).
- `scoped-styles`: the registry that installs each component's rescoped sheet once per document.
- `overlay`, `focus`, `roving`, `drag`, `virtual-window`, `announce`, `forms`, `theming`, `flags`,
  `phone-core`, `scheduler-core`, `swiper-core`.

Component cores: `accordion`, `calendar`, `card`, `carousel`, `checkbox`, `code-snippet`,
`datatable`, `datepicker`, `datetime-picker`, `dock`, `dropdown-menu`, `file-manager`,
`input-group`, `multi-range`, `navbar`, `otp-input`, `pagination`, `phone-input`,
`query-builder`, `radio`, `ribbon`, `scheduler`, `select`, `shell`, `signature-pad`, `splitter`,
`tab-control`, `tile-manager`, `timeline`, `timepicker`, `tree`, `tree-select`, `treeview`,
`typeahead`.

Each is imported as `@mintplayer/ui-core/<entry>`. Architecture: `docs/prd/headless-catalog-437.md`
(the typeahead pilot was #436).
