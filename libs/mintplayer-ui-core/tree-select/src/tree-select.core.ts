import { Announcer } from '@mintplayer/ui-core/announce';
import { SupersedingRequest } from '@mintplayer/ui-core/async';
import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import { trackPopovers } from '@mintplayer/ui-core/overlay';
import { indexTree, isExpandable, type TreeNode } from '@mintplayer/ui-core/tree';
import { EMPTY_TREE_SLICE, TREEVIEW_LABELS, attachTreeController, mergeLoaded, type TreeSlice } from '@mintplayer/ui-core/treeview';
import {
  TREE_SELECT_LABELS,
  cascade,
  connectTreeSelect,
  parseTreeSelectMode,
  parseTreeSelectVariant,
  valueFor,
  valueList,
  type TreeSelectLabels,
  type TreeSelectValue,
  type TreeSelectView,
} from './tree-select';
import type {
  NodePage,
  TreeSelectChangeEventDetail,
  TreeSelectLoadErrorEventDetail,
  TreeSelectMode,
  TreeSelectProvider,
  TreeSelectSearchEventDetail,
  TreeSelectVariant,
} from './types';

/**
 * The tree-select's core (PRD #437 D10): what the generated Angular, React,
 * Vue and Lit components host. `tree-select.component.ts` is their manifest
 * and `templates/tree-select.view.vue` their markup.
 *
 * Data is async-only, through a {@link TreeSelectProvider}; the value holds
 * whole nodes. The tree's keys, focus and lazy loads are the treeview's
 * controller running over `state.tree` (PRD D2 (a)).
 */
export interface TreeSelectInputs {
  provider: TreeSelectProvider | null;
  /** Scalar in `single` mode, an array otherwise. Two-way. */
  value: TreeSelectValue;
  mode: TreeSelectMode;
  variant: TreeSelectVariant;
  /** Checkbox mode: a parent and its loaded children check together. */
  cascadeSelect: boolean;
  placeholder: string;
  /** Shows the clear-all button while something is chosen. */
  showClear: boolean;
  /** The panel body's max height. */
  panelScrollHeight: string;
  disabled: boolean;
  /** Quiet time before a typed query searches. */
  searchDebounceMs: number;
  /** Names the combobox when no `aria-label` does. */
  inputLabel: string | null;
  /** Accessible names and announcements, for translation. */
  labels: Partial<TreeSelectLabels> | null;
}

export interface TreeSelectState {
  value: TreeSelectValue;
  roots: readonly TreeNode[];
  rootsLoaded: boolean;
  rootsHasMore: boolean;
  /** Search results while a query is typed, else null. */
  results: readonly TreeNode[] | null;
  resultsHasMore: boolean;
  query: string;
  loading: boolean;
  open: boolean;
  tree: TreeSlice;
  announcement: string;
}

export interface TreeSelectEvents {
  valueChange: TreeSelectValue;
  /** What changed: the node added or removed, neither for a clear. */
  selectionChanged: TreeSelectChangeEventDetail;
  /** The panel opened (true) or closed (false). */
  openChange: boolean;
  searchStart: TreeSelectSearchEventDetail;
  loadError: TreeSelectLoadErrorEventDetail;
}

export interface TreeSelectMethods {
  open(): void;
  close(): void;
}

type Api = CoreApi<TreeSelectInputs, TreeSelectState, TreeSelectEvents>;

const modeOf = (api: Api) => parseTreeSelectMode(api.inputs().mode);
const panelOf = (api: Api) => api.host.querySelector<HTMLElement>('.ts-panel');
const anchorOf = (api: Api) => api.host.querySelector<HTMLElement>('.ts-anchor');
const comboboxOf = (api: Api) => api.host.querySelector<HTMLInputElement>('input.ts-search');
const shownNodes = (state: Readonly<TreeSelectState>) => mergeLoaded(state.results ?? state.roots, state.tree.loaded);

/** Single mode keeps one node. */
const fitValue = (mode: TreeSelectMode, value: TreeSelectValue): TreeSelectValue => valueFor(mode, valueList(value).slice(0, mode === 'single' ? 1 : undefined));

/** `state.open` follows the panel's own toggle events, so it is the panel's state. */
/**
 * Whether the popover is showing, read from the platform. `state.open` follows
 * it only once the `toggle` event (a queued task) lands, so a key pressed right
 * after Escape would still see the panel as open and never reopen it.
 */
const panelIsOpen = (api: Api): boolean => {
  const panel = panelOf(api);
  if (!panel) return false;
  try {
    return panel.matches(':popover-open');
  } catch {
    return api.state().open; // an engine that cannot parse the pseudo-class
  }
};
const showPanel = (api: Api) => {
  if (api.inputs().disabled || !api.inputs().provider || panelIsOpen(api)) return;
  panelOf(api)?.showPopover?.();
};
const hidePanel = (api: Api) => {
  if (panelIsOpen(api)) panelOf(api)?.hidePopover?.();
};

export const treeSelectCore = defineCore<
  TreeSelectInputs,
  TreeSelectState,
  { view: TreeSelectView },
  TreeSelectEvents,
  undefined,
  undefined,
  TreeSelectMethods
>({
  state: (inputs) => ({
    value: fitValue(parseTreeSelectMode(inputs.mode), inputs.value),
    roots: [],
    rootsLoaded: false,
    rootsHasMore: false,
    results: null,
    resultsHasMore: false,
    query: '',
    loading: false,
    open: false,
    tree: EMPTY_TREE_SLICE,
    announcement: '',
  }),
  view: ({ inputs, state, id, hydrated, label }) => ({
    view: connectTreeSelect({
      id,
      hydrated,
      mode: parseTreeSelectMode(inputs.mode),
      variant: parseTreeSelectVariant(inputs.variant),
      value: valueList(state.value),
      nodes: shownNodes(state),
      tree: state.tree,
      cascadeSelect: !!inputs.cascadeSelect,
      query: state.query,
      open: state.open,
      loading: state.loading,
      hasProvider: !!inputs.provider,
      loaded: state.results !== null || state.rootsLoaded,
      hasMore: state.query ? state.resultsHasMore : state.rootsHasMore,
      disabled: !!inputs.disabled,
      placeholder: inputs.placeholder ?? '',
      showClear: !!inputs.showClear,
      scrollHeight: inputs.panelScrollHeight,
      label: label ?? inputs.inputLabel ?? null,
      announcement: state.announcement,
      labels: inputs.labels ?? undefined,
    }),
  }),
  attach: (api) => {
    const host = api.host;
    const labels = () => ({ ...TREE_SELECT_LABELS, ...(api.inputs().labels ?? {}) });
    const fill = (template: string, values: Record<string, string | number>) =>
      template.replace(/\{(\w+)\}/g, (all, key: string) => (key in values ? String(values[key]) : all));
    const announcer = new Announcer();
    const unsubscribe = announcer.subscribe((s) => api.setState({ announcement: s.text }));
    /** Roots, searches and load-more share one lifecycle: the newest call aborts the last. */
    const runner = new SupersedingRequest({
      onError: (error) => {
        api.setState({ loading: false });
        api.emit('loadError', { error });
      },
    });

    const patchTree = (patch: Partial<TreeSlice>) => api.setState({ tree: { ...api.state().tree, ...patch } });
    const list = () => valueList(api.state().value);
    const index = () => indexTree(shownNodes(api.state()));

    const change = (next: readonly TreeNode[], added?: TreeNode, removed?: TreeNode) => {
      const value = valueFor(modeOf(api), next);
      api.setState({ value });
      const l = labels();
      announcer.announce(
        added ? fill(l.selected, { label: added.label }) : removed ? fill(l.removed, { label: removed.label }) : l.cleared,
      );
      api.emit('valueChange', value);
      api.emit('selectionChanged', { value, ...(added ? { added } : {}), ...(removed ? { removed } : {}) });
    };

    const toggleNode = (node: TreeNode) => {
      const chosen = list().some((n) => n.id === node.id);
      const next =
        modeOf(api) === 'checkbox' && api.inputs().cascadeSelect
          ? cascade(list(), node, !chosen, index())
          : chosen
            ? list().filter((n) => n.id !== node.id)
            : [...list(), node];
      change(next, chosen ? undefined : node, chosen ? node : undefined);
    };

    const pick = (node: TreeNode) => {
      change([node], node);
      hidePanel(api);
      (comboboxOf(api) ?? host.querySelector<HTMLElement>('.ts-button'))?.focus();
    };

    const request = async (
      call: (signal: AbortSignal) => Promise<NodePage>,
      debounced = false,
      onStart?: () => void,
    ): Promise<NodePage | null> => {
      api.setState({ loading: true });
      const result = await runner.run(
        ({ signal }) => {
          onStart?.();
          return call(signal);
        },
        { debounceMs: debounced ? Math.max(0, Number(api.inputs().searchDebounceMs) || 0) : 0 },
      );
      if (result.aborted) return null;
      api.setState({ loading: false });
      return result.value;
    };

    const loadRoots = async (append: boolean) => {
      const provider = api.inputs().provider;
      if (!provider) return;
      const offset = append ? api.state().roots.length : 0;
      const page = await request((signal) => provider.loadRoots({ offset, signal }));
      if (!page) return;
      api.setState({
        roots: append ? [...api.state().roots, ...page.nodes] : page.nodes,
        rootsHasMore: !!page.hasMore,
        rootsLoaded: true,
      });
    };

    const search = async (append: boolean, debounced: boolean) => {
      const provider = api.inputs().provider;
      if (!provider) return;
      const query = api.state().query;
      const offset = append ? (api.state().results?.length ?? 0) : 0;
      const page = await request((signal) => provider.search(query, { offset, signal }), debounced, () =>
        api.emit('searchStart', { query }),
      );
      if (!page) return;
      const results = append ? [...(api.state().results ?? []), ...page.nodes] : page.nodes;
      api.setState({ results, resultsHasMore: !!page.hasMore });
      if (!append) {
        const l = labels();
        announcer.announce(results.length === 1 ? l.oneResult : fill(l.results, { count: results.length }));
      }
    };

    const controller = attachTreeController({
      root: host,
      list: () => host.querySelector('.ts-panel-body > [role="tree"], .ts-panel-body > ul.treeview-tree'),
      nodes: () => shownNodes(api.state()),
      slice: () => api.state().tree,
      patch: patchTree,
      multiple: () => modeOf(api) !== 'single',
      loadChildren: () => {
        const provider = api.inputs().provider;
        return provider
          ? (id: string) => provider.loadChildren(id, { offset: 0, signal: new AbortController().signal }).then((page) => page.nodes)
          : null;
      },
      labels: () => TREEVIEW_LABELS,
      announce: (text) => announcer.announce(text),
      select: (node) => (modeOf(api) === 'single' ? pick(node) : toggleNode(node)),
      click: (node, target) => {
        if (modeOf(api) === 'single') return false;
        // The check glyph and a leaf's row check; a folder's row only expands.
        if (target.closest('[data-ts-check]') || !isExpandable(node)) toggleNode(node);
        else if (api.state().tree.expandedIds.includes(node.id)) controller.collapse(node);
        else controller.expand(node);
        return true;
      },
      expanded: (expansion) => {
        // A checked branch under cascade checks the children it just loaded.
        if (expansion.type !== 'expand' || !expansion.loadedChildren?.length) return;
        if (modeOf(api) !== 'checkbox' || !api.inputs().cascadeSelect) return;
        if (!list().some((n) => n.id === expansion.node.id)) return;
        const ids = new Set(list().map((n) => n.id));
        const descendants = (nodes: readonly TreeNode[]): TreeNode[] => nodes.flatMap((n) => [n, ...descendants(n.children ?? [])]);
        const added = descendants(expansion.loadedChildren).filter((n) => !ids.has(n.id));
        if (!added.length) return;
        api.setState({ value: valueFor(modeOf(api), [...list(), ...added]) });
        api.emit('valueChange', api.state().value);
      },
      loadFailed: (_node, error) => api.emit('loadError', { error }),
    });

    const onInput = (ev: Event) => {
      const input = ev.target as HTMLInputElement;
      if (!input.matches?.('[data-ts-search]')) return;
      api.setState({ query: input.value });
      showPanel(api);
      if (input.value.trim()) {
        void search(false, true);
        return;
      }
      // A blank query, after the same quiet time: drop any search in flight and show the browse tree.
      void runner.run(async () => {
        api.setState({ results: null, resultsHasMore: false, loading: false });
        api.emit('searchStart', { query: '' });
      }, { debounceMs: Math.max(0, Number(api.inputs().searchDebounceMs) || 0) });
    };

    const onFocusIn = (ev: FocusEvent) => {
      // Only focus arriving from outside opens: re-homing focus after a pick or a chip removal must not.
      const from = ev.relatedTarget as Node | null;
      if (from && host.contains(from)) return;
      if ((ev.target as Element).matches?.('input.ts-search[role="combobox"]')) showPanel(api);
    };

    const onClick = (ev: MouseEvent) => {
      const target = ev.target as Element;
      const remove = target.closest?.<HTMLElement>('[data-ts-remove]');
      if (remove) {
        ev.stopPropagation();
        const node = list().find((n) => n.id === remove.getAttribute('data-ts-remove'));
        if (!node) return;
        // The pressed button leaves with its chip: hand focus to the next chip's, else the field.
        const buttons = [...host.querySelectorAll<HTMLElement>('[data-ts-remove]')];
        const at = buttons.indexOf(remove);
        if (modeOf(api) === 'checkbox' && api.inputs().cascadeSelect) change(cascade(list(), node, false, index()), undefined, node);
        else change(list().filter((n) => n.id !== node.id), undefined, node);
        requestAnimationFrame(() => {
          const rest = [...host.querySelectorAll<HTMLElement>('[data-ts-remove]')];
          (rest[Math.min(at, rest.length - 1)] ?? comboboxOf(api))?.focus();
        });
        return;
      }
      if (target.closest?.('[data-ts-clear]')) {
        ev.stopPropagation();
        change([]);
        comboboxOf(api)?.focus();
        return;
      }
      if (target.closest?.('[data-ts-load-more]')) {
        if (api.state().query) void search(true, false);
        else void loadRoots(true);
        return;
      }
      if (target.closest?.('[data-ts-control]') && !target.closest('.ts-panel')) {
        comboboxOf(api)?.focus();
        showPanel(api);
      }
    };

    const onKeydown = (ev: KeyboardEvent) => {
      const target = ev.target as Element;
      if (!target.matches?.('input.ts-search[role="combobox"], .ts-button')) return;
      if (ev.key !== 'ArrowDown') return;
      ev.preventDefault();
      // The first ArrowDown opens; the next hands focus to the tree's tab stop.
      if (!panelIsOpen(api)) showPanel(api);
      else controller.focusStop();
    };

    const onToggle = (ev: Event) => {
      if (ev.target !== panelOf(api)) return;
      const open = (ev as ToggleEvent).newState === 'open';
      if (open === api.state().open) return;
      if (open) {
        api.setState({ open });
        if (!api.state().rootsLoaded) void loadRoots(false);
      } else {
        // A reopened panel shows the browse tree, not stale results.
        runner.cancel();
        api.setState({ open, query: '', results: null, resultsHasMore: false, loading: false });
      }
      api.emit('openChange', open);
    };

    host.addEventListener('input', onInput);
    host.addEventListener('focusin', onFocusIn);
    host.addEventListener('click', onClick);
    host.addEventListener('keydown', onKeydown);
    host.addEventListener('toggle', onToggle, { capture: true });
    const untrack = trackPopovers(host, () => anchorOf(api), { matchAnchorWidth: true });
    return () => {
      host.removeEventListener('input', onInput);
      host.removeEventListener('focusin', onFocusIn);
      host.removeEventListener('click', onClick);
      host.removeEventListener('keydown', onKeydown);
      host.removeEventListener('toggle', onToggle, { capture: true });
      untrack();
      controller.detach();
      runner.dispose();
      unsubscribe();
      announcer.destroy();
    };
  },
  inputsChanged: (api, prev) => {
    const inputs = api.inputs();
    const mode = parseTreeSelectMode(inputs.mode);
    if (inputs.value !== prev.value && inputs.value !== api.state().value) {
      api.setState({ value: fitValue(mode, inputs.value) });
    } else if (inputs.mode !== prev.mode) {
      const before = api.state().value;
      const fitted = fitValue(mode, before);
      api.setState({ value: fitted });
      // Single mode keeps the first node; the shape (scalar or array) follows the mode either way.
      if (valueList(fitted).length !== valueList(before).length || Array.isArray(fitted) !== Array.isArray(before)) {
        api.emit('valueChange', fitted);
      }
    }
    if (inputs.provider !== prev.provider) {
      api.setState({ roots: [], rootsLoaded: false, rootsHasMore: false, results: null, query: '', tree: EMPTY_TREE_SLICE });
      if (api.state().open) hidePanel(api);
    }
    if (inputs.disabled) hidePanel(api);
  },
  methods: {
    open: (api) => showPanel(api),
    close: (api) => hidePanel(api),
  },
});
