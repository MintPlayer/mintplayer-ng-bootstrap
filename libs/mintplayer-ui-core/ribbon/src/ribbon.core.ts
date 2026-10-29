import { Announcer } from '@mintplayer/ui-core/announce';
import { defineCore, type CoreApi } from '@mintplayer/ui-core/component';
import { trackPopovers } from '@mintplayer/ui-core/overlay';
import { allocateKeyTip } from './key-tip-allocator';
import { occupiedWidth, planReduceStep, RIBBON_GROUP_GAP, simplifiedOverflowStart, sizeAtStepIndex } from './plan-reduce-steps';
import {
  RIBBON_CONTEXT,
  connectQuickAccessToolbar,
  connectRibbon,
  connectRibbonButton,
  connectRibbonCheckBox,
  connectRibbonColorPicker,
  connectRibbonComboBox,
  connectRibbonContextualTabSet,
  connectRibbonDropdownButton,
  connectRibbonGallery,
  connectRibbonGalleryItem,
  connectRibbonGroup,
  connectRibbonGroupButton,
  connectRibbonMenuItem,
  connectRibbonMenuSeparator,
  connectRibbonSplitButton,
  connectRibbonTab,
  connectRibbonTemplateItem,
  connectRibbonToggleButton,
  resolveActiveTab,
  ribbonContextualSets,
  ribbonLabel,
  ribbonLabels,
  ribbonTabEntries,
  type RibbonBag,
  type RibbonComboBoxOption,
  type RibbonContext,
  type RibbonGalleryInputs,
  type RibbonGalleryItemInputs,
  type RibbonGroupButtonOption,
  type RibbonGroupInputs,
  type RibbonGroupSize,
  type RibbonGroupView,
  type RibbonInputs,
  type RibbonItemInputs,
  type RibbonItemView,
  type RibbonKeyTipBadge,
  type RibbonMenuButtonView,
  type RibbonMenuItemInputs,
  type RibbonMenuItemView,
  type RibbonOptionView,
  type RibbonOverflowEntry,
  type RibbonQuickAccessToolbarInputs,
  type RibbonRadioView,
  type RibbonReduceStep,
  type RibbonSplitButtonView,
  type RibbonStyle,
  type RibbonTabInputs,
  type RibbonTabView,
  type RibbonView,
} from './ribbon';

/**
 * The ribbon family's cores (PRD #437 D10). The templates render what the
 * inputs and state say; these attach the behaviour that measures or moves
 * focus:
 *
 * - the ribbon: tab selection (manual activation), minimize (double-click,
 *   Ctrl+F1), Ctrl+Arrow between groups, KeyTips (Alt), and the classic reflow
 *   that sizes the active tab's groups down and back up as the width changes;
 * - a tab: the Simplified layout's overflow menu;
 * - a group and the quick access toolbar: roving focus across their controls,
 *   and a collapsed group's popup;
 * - the items: their own commands, and the dropdown and split buttons' menus.
 *
 * Every popup is a native `popover` opened by its trigger's `popovertarget`;
 * the cores only place it, move focus into it and report it.
 */

// ---------------------------------------------------------------------------
// Shared DOM helpers.

const isRtl = (el: Element) => el.ownerDocument.defaultView?.getComputedStyle(el).direction === 'rtl';

const enabled = (el: HTMLElement) => !(el as HTMLButtonElement).disabled;

/** The nearest element matching `selector` from the event target, if `owned` claims it. */
function targetOf(event: Event, selector: string, owned: (el: HTMLElement) => boolean): HTMLElement | null {
  const el = (event.target as Element | null)?.closest?.<HTMLElement>(selector) ?? null;
  return el && owned(el) ? el : null;
}

/** An item's own node: the closest item root above it is `root`, so a nested item's node is not ours. */
const ownedByItem = (root: HTMLElement) => (el: HTMLElement) => el.closest('[data-ribbon-item]') === root;

/**
 * Roving focus across a toolbar's controls (APG toolbar): one tab stop, the
 * arrows move it (mirrored under RTL, wrapping), Home and End jump. A control
 * is any `[data-ribbon-control]` whose nearest toolbar is this one, outside a
 * menu, and enabled. The tabindex is written imperatively: no template binds it.
 */
function attachToolbar(root: HTMLElement, toolbar: () => HTMLElement | null): () => void {
  const controls = (): HTMLElement[] => {
    const bar = toolbar();
    if (!bar) return [];
    return Array.from(bar.querySelectorAll<HTMLElement>('[data-ribbon-control]')).filter(
      (el) => el.closest('[data-ribbon-toolbar]') === bar && !el.closest('[data-ribbon-menu]') && enabled(el),
    );
  };
  const apply = () => {
    const list = controls();
    const current = list.find((el) => el.getAttribute('tabindex') === '0') ?? list[0];
    list.forEach((el) => el.setAttribute('tabindex', el === current ? '0' : '-1'));
  };
  const onFocusIn = (event: FocusEvent) => {
    const list = controls();
    const focused = list.find((el) => el === event.target);
    if (focused) list.forEach((el) => el.setAttribute('tabindex', el === focused ? '0' : '-1'));
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey || event.defaultPrevented) return;
    const { key } = event;
    if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'Home' && key !== 'End') return;
    const target = event.target as HTMLElement;
    if (target.closest('[data-ribbon-toolbar]') !== toolbar() || target.closest('[data-ribbon-menu]')) return;
    if (target.tagName === 'SELECT' || target.tagName === 'TEXTAREA' || (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text')) return;
    const list = controls();
    if (!list.length) return;
    const index = list.indexOf(target);
    const forward = key === (isRtl(root) ? 'ArrowLeft' : 'ArrowRight');
    const next =
      key === 'Home' ? 0
      : key === 'End' ? list.length - 1
      : forward ? (index + 1) % list.length
      : (index <= 0 ? list.length : index) - 1;
    if (next === index) return;
    event.preventDefault();
    list[next].focus();
  };
  const observer = new MutationObserver(apply);
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('keydown', onKeyDown);
  queueMicrotask(apply);
  return () => {
    observer.disconnect();
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('keydown', onKeyDown);
  };
}

interface PopupOptions {
  readonly trigger: () => HTMLElement | null;
  readonly panel: () => HTMLElement | null;
  /** The nodes focus lands on when the popup opens; the first one gets it. */
  readonly items: (panel: HTMLElement) => HTMLElement[];
  /** Up/Down/Home/End move focus across `items` (a menu); a toolbar popup roves on its own. */
  readonly rove: boolean;
  readonly changed: (open: boolean) => void;
}

/**
 * A popover opened by its trigger's `popovertarget`: placed next to the
 * trigger, focus moved into it on open and back to the trigger when it closes
 * with focus inside, ArrowDown on the trigger opens it, and activating a menu
 * item closes it. Escape and light dismiss are the platform's.
 */
function attachPopup(root: HTMLElement, o: PopupOptions): () => void {
  const untrack = trackPopovers(root, (panel) => (panel === o.panel() ? o.trigger() : null));
  // `toggle` does not bubble: heard in the capture phase.
  const onToggle = (event: Event) => {
    const panel = o.panel();
    if (!panel || event.target !== panel) return;
    const open = (event as ToggleEvent).newState === 'open';
    o.changed(open);
    if (open) {
      o.items(panel)[0]?.focus();
      return;
    }
    const active = root.ownerDocument.activeElement;
    if (!active || active === root.ownerDocument.body || panel.contains(active)) o.trigger()?.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const panel = o.panel();
    if (!panel) return;
    if (event.target === o.trigger() && event.key === 'ArrowDown' && !panel.matches(':popover-open')) {
      event.preventDefault();
      panel.showPopover();
      return;
    }
    if (!o.rove || !panel.contains(event.target as Node)) return;
    const items = menuItemsOf(panel);
    const index = items.indexOf(event.target as HTMLElement);
    const { key } = event;
    const next =
      key === 'Home' ? 0
      : key === 'End' ? items.length - 1
      : key === 'ArrowDown' ? (index + 1) % items.length
      : key === 'ArrowUp' ? (index <= 0 ? items.length : index) - 1
      : -1;
    if (next < 0 || !items.length) return;
    event.preventDefault();
    items[next].focus();
  };
  const onClick = (event: MouseEvent) => {
    const panel = o.panel();
    if (!panel?.matches(':popover-open')) return;
    const item = (event.target as Element).closest?.('[role^="menuitem"]');
    if (item && item.closest('[data-ribbon-menu]') === panel) panel.hidePopover();
  };
  root.addEventListener('toggle', onToggle, { capture: true });
  root.addEventListener('keydown', onKeyDown);
  root.addEventListener('click', onClick);
  return () => {
    untrack();
    root.removeEventListener('toggle', onToggle, { capture: true });
    root.removeEventListener('keydown', onKeyDown);
    root.removeEventListener('click', onClick);
  };
}

const menuItemsOf = (panel: HTMLElement) =>
  Array.from(panel.querySelectorAll<HTMLElement>('[role^="menuitem"]')).filter((el) => el.closest('[data-ribbon-menu]') === panel && enabled(el));

// ---------------------------------------------------------------------------
// The ribbon.

export interface RibbonState {
  /** The requested tab; the view resolves it against the shown tabs. */
  activeTabId: string;
  minimized: boolean;
  keyTipBadges: readonly RibbonKeyTipBadge[];
  announcement: string;
}

export interface RibbonTabChangeEventDetail {
  readonly previousTabId: string | null;
  readonly activeTabId: string;
}

export interface RibbonEvents {
  activeTabIdChange: string;
  minimizedChange: boolean;
  tabChange: RibbonTabChangeEventDetail;
}

type RibbonApi = CoreApi<RibbonInputs, RibbonState, RibbonEvents>;

interface RibbonEngine {
  inputsChanged(prev: Readonly<RibbonInputs>): void;
}

const ribbonEngines = new WeakMap<HTMLElement, RibbonEngine>();

const isTarget = (size: string | null): size is RibbonGroupSize => size === 'large' || size === 'medium' || size === 'small' || size === 'popup';

/**
 * A group's size, as the reflow decided it: `data-resolved-size` on the
 * group's root (the sheet sizes its items from it). A collapsed group's body
 * becomes a popover behind the group's trigger; anything else shows it inline.
 */
function setGroupSize(group: HTMLElement, size: RibbonGroupSize | null): void {
  if (size) group.setAttribute('data-resolved-size', size);
  else group.removeAttribute('data-resolved-size');
  const body = Array.from(group.querySelectorAll<HTMLElement>('[data-ribbon-group-body]')).find((el) => el.closest('[data-ribbon-group]') === group);
  if (!body) return;
  if (size === 'popup') {
    if (!body.hasAttribute('popover')) body.setAttribute('popover', 'auto');
  } else if (body.hasAttribute('popover')) {
    if (body.matches(':popover-open')) body.hidePopover();
    body.removeAttribute('popover');
  }
}

function attachRibbon(api: RibbonApi): () => void {
  const root = api.host;
  const doc = root.ownerDocument;
  const view = doc.defaultView;
  const announcer = new Announcer();
  const unsubscribe = announcer.subscribe((s) => api.setState({ announcement: s.text }));
  const labels = () => ribbonLabels(api.inputs().labels);
  const ours = (el: Element) => el.closest('.ribbon') === root;

  const entries = () => ribbonTabEntries(api.inputs().tabs);
  const activeTab = () => resolveActiveTab(entries(), api.state().activeTabId);
  const tabButtons = () => Array.from(root.querySelectorAll<HTMLElement>('[data-ribbon-tab]')).filter(ours);
  const activePanel = () => Array.from(root.querySelectorAll<HTMLElement>('[data-ribbon-panel][data-active]')).find(ours) ?? null;
  const groupsOf = (panel: HTMLElement) =>
    Array.from(panel.querySelectorAll<HTMLElement>('[data-ribbon-group]')).filter((g) => g.closest('[data-ribbon-panel]') === panel);

  // ---- tabs and minimize ----

  const selectTab = (tabId: string) => {
    const previousTabId = activeTab();
    if (tabId === previousTabId && tabId === api.state().activeTabId) return;
    api.setState({ activeTabId: tabId });
    api.emit('activeTabIdChange', tabId);
    api.emit('tabChange', { previousTabId, activeTabId: tabId });
    scheduleReflow();
  };
  const setMinimized = (minimized: boolean, report: boolean) => {
    if (minimized === api.state().minimized) return;
    api.setState({ minimized });
    if (report) api.emit('minimizedChange', minimized);
    announcer.announce(minimized ? labels().minimized : labels().restored);
    scheduleReflow();
  };

  const onClick = (event: MouseEvent) => {
    const tab = targetOf(event, '[data-ribbon-tab]', ours);
    if (tab) selectTab(tab.getAttribute('data-ribbon-tab') ?? '');
  };
  const onDblClick = (event: MouseEvent) => {
    if (targetOf(event, '[data-ribbon-tab]', ours)) setMinimized(!api.state().minimized, true);
  };

  /** Ctrl+Left/Right: the next group's current stop, skipping collapsed groups whose popup is shut. */
  const moveBetweenGroups = (from: HTMLElement, forward: boolean): boolean => {
    const panel = activePanel();
    if (!panel) return false;
    const groups = groupsOf(panel).filter((g) => g.getAttribute('data-resolved-size') !== 'popup' || g.querySelector(':popover-open'));
    const next = groups[groups.indexOf(from) + (forward ? 1 : -1)];
    if (!next || groups.indexOf(from) < 0) return false;
    const controls = Array.from(next.querySelectorAll<HTMLElement>('[data-ribbon-control]')).filter((el) => enabled(el) && !el.closest('[data-ribbon-menu]'));
    const target = controls.find((el) => el.getAttribute('tabindex') === '0') ?? controls[0];
    target?.focus();
    return !!target;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.ctrlKey && event.key === 'F1') {
      event.preventDefault();
      setMinimized(!api.state().minimized, true);
      return;
    }
    const tab = targetOf(event, '[data-ribbon-tab]', ours);
    if (tab) {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      const buttons = tabButtons();
      const index = buttons.indexOf(tab);
      const forward = isRtl(root) ? 'ArrowLeft' : 'ArrowRight';
      const back = isRtl(root) ? 'ArrowRight' : 'ArrowLeft';
      const next =
        event.key === 'Home' ? 0
        : event.key === 'End' ? buttons.length - 1
        : event.key === forward || event.key === 'ArrowDown' ? Math.min(buttons.length - 1, index + 1)
        : event.key === back || event.key === 'ArrowUp' ? Math.max(0, index - 1)
        : -1;
      if (next < 0) return;
      event.preventDefault();
      buttons[next]?.focus();
      return;
    }
    if (event.ctrlKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      const group = targetOf(event, '[data-ribbon-group]', ours);
      if (group && moveBetweenGroups(group, (event.key === 'ArrowRight') !== isRtl(root))) event.preventDefault();
    }
  };

  // ---- KeyTips ----

  let keyTipMode: 'off' | 'tabs' | 'items' = 'off';
  let keyTipTargets: HTMLElement[] = [];
  let altDown = false;
  let altCombo = false;
  let keyTipFrame = 0;

  const showBadges = (badges: { tip: string; target: HTMLElement; left: number; top: number }[]) => {
    keyTipTargets = badges.map((b) => b.target);
    api.setState({ keyTipBadges: badges.map(({ tip, left, top }) => ({ tip, left, top })) });
  };
  const closeKeyTips = () => {
    keyTipMode = 'off';
    keyTipTargets = [];
    if (keyTipFrame) view?.cancelAnimationFrame(keyTipFrame);
    keyTipFrame = 0;
    if (api.state().keyTipBadges.length) api.setState({ keyTipBadges: [] });
  };
  const openTabLevel = () => {
    keyTipMode = 'tabs';
    const used = new Set<string>();
    showBadges(
      tabButtons().map((button) => {
        const r = button.getBoundingClientRect();
        return { tip: allocateKeyTip(button.textContent?.trim() ?? '', button.getAttribute('data-key-tip'), used), target: button, left: r.left + 4, top: r.bottom - 4 };
      }),
    );
  };
  const openItemLevel = () => {
    keyTipMode = 'items';
    showBadges([]);
    // The selected tab's panel renders first.
    keyTipFrame =
      view?.requestAnimationFrame(() => {
        keyTipFrame = 0;
        const panel = activePanel();
        if (!panel || keyTipMode !== 'items') return;
        const used = new Set<string>();
        const badges = groupsOf(panel).flatMap((group) => {
          if (group.getAttribute('data-resolved-size') === 'popup') {
            const trigger = group.querySelector<HTMLElement>('[data-ribbon-popup-trigger]');
            if (!trigger) return [];
            const r = trigger.getBoundingClientRect();
            return [{ tip: allocateKeyTip(group.getAttribute('data-label') ?? '', group.getAttribute('data-key-tip'), used), target: trigger, left: r.left + 4, top: r.bottom - 6 }];
          }
          return Array.from(group.querySelectorAll<HTMLElement>('[data-ribbon-item]'))
            .filter((item) => !item.hasAttribute('data-disabled') && item.closest('[data-ribbon-group]') === group && !item.closest('[data-ribbon-menu]'))
            .flatMap((item) => {
              const control = item.querySelector<HTMLElement>('[data-ribbon-control]');
              if (!control) return [];
              const r = item.getBoundingClientRect();
              return [{ tip: allocateKeyTip(item.getAttribute('data-label') ?? '', item.getAttribute('data-key-tip'), used), target: control, left: r.left + 2, top: r.bottom - 6 }];
            });
        });
        showBadges(badges);
      }) ?? 0;
  };

  const onDocKeyDown = (event: KeyboardEvent) => {
    if (api.inputs().keyTips === 'off') return;
    if (event.key === 'Alt') {
      if (!event.repeat) {
        altDown = true;
        altCombo = false;
      }
      return;
    }
    if (event.altKey) {
      altCombo = true;
      return;
    }
    if (keyTipMode === 'off') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (keyTipMode === 'items') openTabLevel();
      else closeKeyTips();
      return;
    }
    if (event.key.length !== 1) return;
    const index = api.state().keyTipBadges.findIndex((b) => b.tip === event.key.toUpperCase());
    const target = keyTipTargets[index];
    if (!target) return;
    event.preventDefault();
    if (keyTipMode === 'tabs') {
      selectTab(target.getAttribute('data-ribbon-tab') ?? '');
      openItemLevel();
    } else {
      closeKeyTips();
      target.focus();
      target.click();
    }
  };
  const onDocKeyUp = (event: KeyboardEvent) => {
    if (api.inputs().keyTips === 'off' || event.key !== 'Alt' || !altDown) return;
    altDown = false;
    if (altCombo) return;
    event.preventDefault();
    if (keyTipMode === 'off') openTabLevel();
    else closeKeyTips();
  };
  const onBlur = () => closeKeyTips();

  // ---- the classic reflow ----

  let reflowFrame = 0;
  const naturalWidths = new WeakMap<HTMLElement, number>();
  const appliedSteps = new WeakMap<HTMLElement, number>();
  let collapsed = new Map<HTMLElement, string>();

  const scheduleReflow = () => {
    if (reflowFrame || !view) return;
    reflowFrame = view.requestAnimationFrame(() => {
      reflowFrame = 0;
      reflow();
    });
  };

  const announceCollapsed = (groups: readonly HTMLElement[]) => {
    const now = new Map(groups.filter((g) => g.getAttribute('data-resolved-size') === 'popup').map((g) => [g, g.getAttribute('data-label') ?? '']));
    now.forEach((label, group) => {
      if (!collapsed.has(group) && label) announcer.announce(ribbonLabel(labels().groupCollapsed, { label }));
    });
    collapsed.forEach((label, group) => {
      if (!now.has(group) && label) announcer.announce(ribbonLabel(labels().groupExpanded, { label }));
    });
    collapsed = now;
  };

  /** A tab's `reduceOrder`: walk forward while too wide, back while the previous step fits. */
  const applyReduceOrder = (panel: HTMLElement, groups: readonly HTMLElement[], steps: readonly RibbonReduceStep[], idealSizes: Readonly<Record<string, RibbonGroupSize>>): boolean => {
    const available = panel.clientWidth;
    const occupied = () => occupiedWidth(groups.map((g) => g.offsetWidth), RIBBON_GROUP_GAP);
    const byId = (id: string) => groups.find((g) => g.getAttribute('data-ribbon-group') === id) ?? null;
    const ideal = { ...idealSizes };
    let applied = Math.min(appliedSteps.get(panel) ?? 0, steps.length);
    let mutated = false;
    while (occupied() > available && applied < steps.length) {
      const [groupId, target] = steps[applied];
      const group = byId(groupId);
      applied++;
      if (!group || group.getAttribute('data-auto-scale') === 'false' || !isTarget(target)) continue;
      setGroupSize(group, target);
      mutated = true;
    }
    while (applied > 0) {
      const [groupId] = steps[applied - 1];
      const group = byId(groupId);
      if (!group) {
        applied--;
        continue;
      }
      setGroupSize(group, sizeAtStepIndex(steps, applied - 1, groupId, ideal));
      if (occupied() > available) {
        setGroupSize(group, sizeAtStepIndex(steps, applied, groupId, ideal));
        break;
      }
      applied--;
      mutated = true;
    }
    appliedSteps.set(panel, applied);
    return mutated;
  };

  const reflow = () => {
    if (api.state().minimized) return;
    const panel = activePanel();
    if (!panel) return;
    const groups = groupsOf(panel);
    if (!groups.length) return;
    if (api.inputs().layout === 'simplified') {
      groups.forEach((g) => setGroupSize(g, null));
      announceCollapsed(groups);
      return;
    }
    groups.forEach((g) => {
      if (g.getAttribute('data-resolved-size') !== 'popup') naturalWidths.set(g, g.offsetWidth);
    });
    const tab = (api.inputs().tabs ?? []).find((t) => t.inputs.tabId === panel.getAttribute('data-ribbon-panel'))?.inputs;
    const steps = tab?.reduceOrder ?? [];
    if (steps.length) {
      if (applyReduceOrder(panel, groups, steps, tab?.idealSizes ?? {})) scheduleReflow();
      else announceCollapsed(groups);
      return;
    }
    const available = panel.clientWidth;
    const measure = () => ({
      available,
      gap: RIBBON_GROUP_GAP,
      groups: groups.map((g) => ({
        width: g.offsetWidth,
        naturalWidth: naturalWidths.get(g) ?? 0,
        priority: Number(g.getAttribute('data-priority') ?? '0'),
        autoScale: g.getAttribute('data-auto-scale') !== 'false',
        collapsed: g.getAttribute('data-resolved-size') === 'popup',
      })),
    });
    let mutated = false;
    const phase = (action: 'collapse' | 'expand') =>
      groups.some(() => {
        const step = planReduceStep(measure());
        if (step?.action !== action) return true;
        setGroupSize(groups[step.index], action === 'collapse' ? 'popup' : null);
        mutated = true;
        return false;
      });
    phase('collapse');
    phase('expand');
    if (mutated) scheduleReflow();
    else announceCollapsed(groups);
  };

  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleReflow);
  resizeObserver?.observe(root);

  root.addEventListener('click', onClick);
  root.addEventListener('dblclick', onDblClick);
  root.addEventListener('keydown', onKeyDown);
  doc.addEventListener('keydown', onDocKeyDown);
  doc.addEventListener('keyup', onDocKeyUp);
  view?.addEventListener('blur', onBlur);

  let sets = ribbonContextualSets(api.inputs().tabs);
  ribbonEngines.set(root, {
    inputsChanged(prev) {
      const now = api.inputs();
      if (now.activeTabId !== prev.activeTabId && now.activeTabId !== undefined) api.setState({ activeTabId: now.activeTabId ?? '' });
      if (now.minimized !== prev.minimized) setMinimized(!!now.minimized, false);
      if (now.tabs !== prev.tabs) {
        const next = ribbonContextualSets(now.tabs);
        next.forEach((visible, label) => {
          const before = sets.get(label);
          if (before !== undefined && before !== visible) announcer.announce(ribbonLabel(visible ? labels().contextualShown : labels().contextualHidden, { label }));
        });
        sets = next;
      }
      scheduleReflow();
    },
  });
  scheduleReflow();

  return () => {
    ribbonEngines.delete(root);
    resizeObserver?.disconnect();
    if (reflowFrame) view?.cancelAnimationFrame(reflowFrame);
    closeKeyTips();
    root.removeEventListener('click', onClick);
    root.removeEventListener('dblclick', onDblClick);
    root.removeEventListener('keydown', onKeyDown);
    doc.removeEventListener('keydown', onDocKeyDown);
    doc.removeEventListener('keyup', onDocKeyUp);
    view?.removeEventListener('blur', onBlur);
    unsubscribe();
    announcer.destroy();
  };
}

export const ribbonCore = defineCore<RibbonInputs, RibbonState, { view: RibbonView }, RibbonEvents, undefined, RibbonContext>({
  provides: RIBBON_CONTEXT,
  state: (inputs) => ({ activeTabId: inputs.activeTabId ?? '', minimized: !!inputs.minimized, keyTipBadges: [], announcement: '' }),
  view: ({ inputs, state, id, hydrated, label }) => {
    const entries = ribbonTabEntries(inputs.tabs);
    return {
      view: connectRibbon({
        id,
        entries,
        activeTabId: resolveActiveTab(entries, state.activeTabId),
        minimized: state.minimized,
        layout: inputs.layout === 'simplified' ? 'simplified' : 'classic',
        version: inputs.version ?? 'office-2016',
        colorScheme: inputs.colorScheme ?? 'auto',
        touchMode: inputs.touchMode ?? 'auto',
        label,
        labels: ribbonLabels(inputs.labels),
        hydrated,
        keyTips: state.keyTipBadges,
        live: {},
        announcement: state.announcement,
      }),
    };
  },
  provide: ({ inputs, state, id }) => ({
    ribbonId: id,
    activeTabId: resolveActiveTab(ribbonTabEntries(inputs.tabs), state.activeTabId),
    minimized: state.minimized,
    layout: inputs.layout === 'simplified' ? 'simplified' : 'classic',
    labels: ribbonLabels(inputs.labels),
    idealSizes: null,
  }),
  attach: attachRibbon,
  inputsChanged: (api, prev) => ribbonEngines.get(api.host)?.inputsChanged(prev),
});

// ---------------------------------------------------------------------------
// Contextual tab set: data for the ribbon's content query, transparent in the layout.

export const ribbonContextualTabSetCore = defineCore<Record<string, unknown>, Record<string, never>, { root: RibbonBag }>({
  view: () => ({ root: connectRibbonContextualTabSet() }),
});

// ---------------------------------------------------------------------------
// Tab: its tabpanel, and the Simplified layout's overflow.

export interface RibbonTabState {
  overflow: readonly RibbonOverflowEntry[];
  overflowOpen: boolean;
}

function attachRibbonTab(api: CoreApi<RibbonTabInputs, RibbonTabState, Record<never, never>>): () => void {
  const root = api.host;
  const view = root.ownerDocument.defaultView;
  let targets: HTMLElement[] = [];
  let frame = 0;
  let layoutObserved: Element | null = null;
  const trigger = () => root.querySelector<HTMLElement>(':scope > .overflow-trigger');
  const menu = () => root.querySelector<HTMLElement>(':scope > .overflow-panel');

  const reflow = () => {
    frame = 0;
    const ribbon = root.closest('.ribbon');
    if (ribbon && ribbon !== layoutObserved) {
      layoutObserved = ribbon;
      layoutObserver.observe(ribbon, { attributes: true, attributeFilter: ['data-layout'] });
    }
    const groups = Array.from(root.querySelectorAll<HTMLElement>('[data-ribbon-group]')).filter((g) => g.closest('[data-ribbon-panel]') === root);
    groups.forEach((g) => g.removeAttribute('data-overflow-hidden'));
    const available = root.clientWidth;
    if (ribbon?.getAttribute('data-layout') !== 'simplified' || !root.hasAttribute('data-active') || available <= 0 || !groups.length) {
      targets = [];
      if (api.state().overflow.length) api.setState({ overflow: [] });
      return;
    }
    const hidden = groups.slice(simplifiedOverflowStart(groups.map((g) => g.offsetWidth), available));
    hidden.forEach((g) => g.setAttribute('data-overflow-hidden', ''));
    const items = hidden.flatMap((g) =>
      Array.from(g.querySelectorAll<HTMLElement>('[data-ribbon-item]')).filter((item) => !item.hasAttribute('data-disabled') && !item.closest('[data-ribbon-menu]')),
    );
    const entries = items.flatMap((item) => {
      const control = item.querySelector<HTMLElement>('[data-ribbon-control]');
      return control ? [{ entry: { label: item.getAttribute('data-label') ?? '', icon: item.getAttribute('data-icon') ?? '' }, control }] : [];
    });
    targets = entries.map((e) => e.control);
    const overflow = entries.map((e) => e.entry);
    const same = overflow.length === api.state().overflow.length && overflow.every((e, i) => e.label === api.state().overflow[i].label && e.icon === api.state().overflow[i].icon);
    if (!same) api.setState({ overflow });
    if (!overflow.length && menu()?.matches(':popover-open')) menu()?.hidePopover();
  };
  const schedule = () => {
    if (!frame && view) frame = view.requestAnimationFrame(reflow);
  };
  const layoutObserver = new MutationObserver(schedule);
  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
  resizeObserver?.observe(root);
  const activeObserver = new MutationObserver(schedule);
  activeObserver.observe(root, { attributes: true, attributeFilter: ['data-active', 'hidden'] });

  const onClick = (event: MouseEvent) => {
    const entry = (event.target as Element).closest?.<HTMLElement>('[data-ribbon-overflow-entry]');
    if (!entry || entry.closest('[data-ribbon-panel]') !== root) return;
    const target = targets[Number(entry.getAttribute('data-ribbon-overflow-entry'))];
    menu()?.hidePopover();
    target?.click();
  };
  const detachPopup = attachPopup(root, {
    trigger,
    panel: menu,
    items: menuItemsOf,
    rove: true,
    changed: (overflowOpen) => api.setState({ overflowOpen }),
  });
  root.addEventListener('click', onClick);
  schedule();
  return () => {
    if (frame) view?.cancelAnimationFrame(frame);
    layoutObserver.disconnect();
    resizeObserver?.disconnect();
    activeObserver.disconnect();
    detachPopup();
    root.removeEventListener('click', onClick);
  };
}

export const ribbonTabCore = defineCore<RibbonTabInputs, RibbonTabState, { view: RibbonTabView }, Record<never, never>, RibbonContext, RibbonContext>({
  consume: RIBBON_CONTEXT,
  provides: RIBBON_CONTEXT,
  state: () => ({ overflow: [], overflowOpen: false }),
  view: ({ inputs, state, id, hydrated, context }) => ({
    view: connectRibbonTab({ id, tabId: inputs.tabId ?? '', context, overflow: state.overflow, overflowOpen: state.overflowOpen, hydrated }),
  }),
  provide: ({ inputs, context }) => ({ ...context, idealSizes: inputs.idealSizes ?? null }),
  attach: attachRibbonTab,
});

// ---------------------------------------------------------------------------
// Group.

export interface RibbonDialogLauncherClickEventDetail {
  groupId: string;
}

export interface RibbonGroupEvents {
  dialogLauncherClick: RibbonDialogLauncherClickEventDetail;
}

export const ribbonGroupCore = defineCore<RibbonGroupInputs, { open: boolean }, { view: RibbonGroupView }, RibbonGroupEvents, RibbonContext>({
  consume: RIBBON_CONTEXT,
  state: () => ({ open: false }),
  view: ({ inputs, state, id, hydrated, context }) => ({ view: connectRibbonGroup({ id, inputs, context, open: state.open, hydrated }) }),
  attach: (api) => {
    const root = api.host;
    const own = (el: Element) => el.closest('[data-ribbon-group]') === root;
    const body = () => Array.from(root.querySelectorAll<HTMLElement>('[data-ribbon-group-body]')).find(own) ?? null;
    const trigger = () => Array.from(root.querySelectorAll<HTMLElement>('[data-ribbon-popup-trigger]')).find(own) ?? null;
    const detachToolbar = attachToolbar(root, body);
    const detachPopup = attachPopup(root, {
      trigger,
      panel: body,
      items: (panel) => Array.from(panel.querySelectorAll<HTMLElement>('[data-ribbon-control]')).filter((el) => el.closest('[data-ribbon-toolbar]') === panel && enabled(el)),
      rove: false,
      changed: (open) => api.setState({ open }),
    });
    const onClick = (event: MouseEvent) => {
      if (targetOf(event, '[data-ribbon-launcher]', own)) api.emit('dialogLauncherClick', { groupId: api.inputs().groupId ?? '' });
    };
    root.addEventListener('click', onClick);
    return () => {
      detachToolbar();
      detachPopup();
      root.removeEventListener('click', onClick);
    };
  },
});

// ---------------------------------------------------------------------------
// Quick access toolbar.

export const quickAccessToolbarCore = defineCore<RibbonQuickAccessToolbarInputs, Record<string, never>, { root: RibbonBag }, Record<never, never>, RibbonContext>({
  consume: RIBBON_CONTEXT,
  view: ({ inputs, label, context }) => ({ root: connectQuickAccessToolbar({ touchMode: inputs.touchMode ?? 'auto', label, labels: context.labels }) }),
  attach: (api) => attachToolbar(api.host, () => api.host),
});

// ---------------------------------------------------------------------------
// Items.

type ItemApi<I, S, E> = CoreApi<I, S, E>;

/** Delegate clicks on the item's own `selector` node to `handle`. */
function onOwn<I, S, E>(api: ItemApi<I, S, E>, type: 'click' | 'change' | 'input', selector: string, handle: (el: HTMLElement, event: Event) => void): () => void {
  const root = api.host;
  const listener = (event: Event) => {
    const el = targetOf(event, selector, ownedByItem(root));
    if (el && enabled(el)) handle(el, event);
  };
  root.addEventListener(type, listener);
  return () => root.removeEventListener(type, listener);
}

export interface RibbonItemClickEventDetail {
  readonly itemId: string;
}

export interface RibbonButtonEvents {
  itemClick: RibbonItemClickEventDetail;
}

export const ribbonButtonCore = defineCore<RibbonItemInputs, Record<string, never>, { view: RibbonItemView }, RibbonButtonEvents>({
  view: ({ inputs, hydrated }) => ({ view: connectRibbonButton({ kind: 'button', inputs, hydrated }) }),
  attach: (api) => onOwn(api, 'click', '[data-ribbon-control]', () => api.emit('itemClick', { itemId: api.inputs().itemId ?? '' })),
});

export interface RibbonToggleButtonInputs extends RibbonItemInputs {
  pressed?: boolean;
}

export const ribbonToggleButtonCore = defineCore<RibbonToggleButtonInputs, { pressed: boolean }, { view: RibbonItemView }, { pressedChange: boolean }>({
  state: (inputs) => ({ pressed: !!inputs.pressed }),
  view: ({ inputs, state, hydrated }) => ({ view: connectRibbonToggleButton({ kind: 'toggle-button', inputs, hydrated, pressed: state.pressed }) }),
  attach: (api) =>
    onOwn(api, 'click', '[data-ribbon-control]', () => {
      const pressed = !api.state().pressed;
      api.setState({ pressed });
      api.emit('pressedChange', pressed);
    }),
  inputsChanged: (api, prev) => {
    if (api.inputs().pressed !== prev.pressed) api.setState({ pressed: !!api.inputs().pressed });
  },
});

export interface RibbonCheckBoxInputs extends RibbonItemInputs {
  checked?: boolean;
}

export const ribbonCheckBoxCore = defineCore<RibbonCheckBoxInputs, { checked: boolean }, { view: RibbonItemView }, { checkedChange: boolean }>({
  state: (inputs) => ({ checked: !!inputs.checked }),
  view: ({ inputs, state, hydrated }) => ({ view: connectRibbonCheckBox({ kind: 'checkbox', inputs, hydrated, checked: state.checked }) }),
  attach: (api) =>
    onOwn(api, 'change', '[data-ribbon-control]', (el) => {
      const checked = (el as HTMLInputElement).checked;
      api.setState({ checked });
      api.emit('checkedChange', checked);
    }),
  inputsChanged: (api, prev) => {
    if (api.inputs().checked !== prev.checked) api.setState({ checked: !!api.inputs().checked });
  },
});

export interface RibbonComboBoxInputs extends RibbonItemInputs {
  value?: string;
  options?: readonly RibbonComboBoxOption[];
}

export const ribbonComboBoxCore = defineCore<
  RibbonComboBoxInputs,
  { value: string },
  { view: RibbonItemView; options: readonly RibbonOptionView[] },
  { valueChange: string }
>({
  state: (inputs) => ({ value: inputs.value ?? '' }),
  view: ({ inputs, state, hydrated }) => {
    const { options, ...view } = connectRibbonComboBox({ kind: 'combobox', inputs, hydrated, value: state.value, options: inputs.options ?? [] });
    return { view, options };
  },
  attach: (api) =>
    onOwn(api, 'change', '[data-ribbon-control]', (el) => {
      const value = (el as HTMLSelectElement).value;
      api.setState({ value });
      api.emit('valueChange', value);
    }),
  inputsChanged: (api, prev) => {
    if (api.inputs().value !== prev.value) api.setState({ value: api.inputs().value ?? '' });
  },
});

export interface RibbonColorPickerInputs extends RibbonItemInputs {
  color?: string;
}

export const ribbonColorPickerCore = defineCore<RibbonColorPickerInputs, { color: string }, { view: RibbonItemView }, { colorChange: string }>({
  state: (inputs) => ({ color: inputs.color || '#000000' }),
  view: ({ inputs, state, hydrated }) => ({ view: connectRibbonColorPicker({ kind: 'color-picker', inputs, hydrated, color: state.color }) }),
  attach: (api) =>
    onOwn(api, 'input', '[data-ribbon-control]', (el) => {
      const color = (el as HTMLInputElement).value;
      api.setState({ color });
      api.emit('colorChange', color);
    }),
  inputsChanged: (api, prev) => {
    if (api.inputs().color !== prev.color) api.setState({ color: api.inputs().color || '#000000' });
  },
});

export interface RibbonGroupButtonInputs extends RibbonItemInputs {
  selectedValue?: string;
  buttons?: readonly RibbonGroupButtonOption[];
}

export const ribbonGroupButtonCore = defineCore<
  RibbonGroupButtonInputs,
  { selectedValue: string },
  { view: RibbonItemView; radios: readonly RibbonRadioView[] },
  { selectedValueChange: string }
>({
  state: (inputs) => ({ selectedValue: inputs.selectedValue ?? '' }),
  view: ({ inputs, state, hydrated }) => {
    const { radios, ...view } = connectRibbonGroupButton({ kind: 'group-button', inputs, hydrated, selectedValue: state.selectedValue, buttons: inputs.buttons ?? [] });
    return { view, radios };
  },
  attach: (api) =>
    onOwn(api, 'click', '[data-value]', (el) => {
      const selectedValue = el.getAttribute('data-value') ?? '';
      if (selectedValue === api.state().selectedValue) return;
      api.setState({ selectedValue });
      api.emit('selectedValueChange', selectedValue);
    }),
  inputsChanged: (api, prev) => {
    if (api.inputs().selectedValue !== prev.selectedValue) api.setState({ selectedValue: api.inputs().selectedValue ?? '' });
  },
});

export interface RibbonMenuToggleEventDetail {
  readonly itemId: string;
  readonly open: boolean;
}

/** A dropdown or split button's menu: the popover beside the item's trigger. */
function attachItemMenu<I extends RibbonItemInputs, E extends { menuToggle: RibbonMenuToggleEventDetail }>(api: CoreApi<I, { open: boolean }, E>): () => void {
  const root = api.host;
  const own = ownedByItem(root);
  const first = (selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector)).find(own) ?? null;
  return attachPopup(root, {
    trigger: () => first('[data-ribbon-menu-trigger]'),
    panel: () => first('[data-ribbon-menu]'),
    items: menuItemsOf,
    rove: true,
    changed: (open) => {
      api.setState({ open });
      (api as unknown as CoreApi<I, { open: boolean }, { menuToggle: RibbonMenuToggleEventDetail }>).emit('menuToggle', { itemId: api.inputs().itemId ?? '', open });
    },
  });
}

export interface RibbonDropdownButtonEvents {
  menuToggle: RibbonMenuToggleEventDetail;
}

export const ribbonDropdownButtonCore = defineCore<RibbonItemInputs, { open: boolean }, { view: RibbonMenuButtonView }, RibbonDropdownButtonEvents>({
  state: () => ({ open: false }),
  view: ({ inputs, state, id, hydrated }) => ({ view: connectRibbonDropdownButton({ kind: 'dropdown-button', inputs, hydrated, id, open: state.open }) }),
  attach: (api) => attachItemMenu(api),
});

export interface RibbonSplitButtonEvents {
  mainAction: RibbonItemClickEventDetail;
  itemClick: RibbonItemClickEventDetail;
  menuToggle: RibbonMenuToggleEventDetail;
}

export const ribbonSplitButtonCore = defineCore<RibbonItemInputs, { open: boolean }, { view: RibbonSplitButtonView }, RibbonSplitButtonEvents, RibbonContext>({
  consume: RIBBON_CONTEXT,
  state: () => ({ open: false }),
  view: ({ inputs, state, id, hydrated, context }) => ({
    view: connectRibbonSplitButton({ kind: 'split-button', inputs, hydrated, id, open: state.open, labels: context.labels }),
  }),
  attach: (api) => {
    const detachMenu = attachItemMenu(api);
    const detachMain = onOwn(api, 'click', '[data-ribbon-main]', () => {
      const detail = { itemId: api.inputs().itemId ?? '' };
      api.emit('mainAction', detail);
      api.emit('itemClick', detail);
    });
    return () => {
      detachMenu();
      detachMain();
    };
  },
});

export interface RibbonMenuSelectEventDetail {
  readonly itemId: string;
  readonly checked: boolean;
}

export interface RibbonMenuItemEvents {
  checkedChange: boolean;
  menuSelect: RibbonMenuSelectEventDetail;
}

export const ribbonMenuItemCore = defineCore<RibbonMenuItemInputs, { checked: boolean }, { view: RibbonMenuItemView }, RibbonMenuItemEvents>({
  state: (inputs) => ({ checked: !!inputs.checked }),
  view: ({ inputs, state, hydrated }) => ({ view: connectRibbonMenuItem({ inputs, checked: state.checked, hydrated }) }),
  attach: (api) => {
    const root = api.host;
    const onClick = (event: MouseEvent) => {
      const button = targetOf(event, '[data-ribbon-menu-item]', (el) => el.closest('.ribbon-menu-item') === root);
      if (!button || !enabled(button)) return;
      const kind = api.inputs().kind ?? 'action';
      const was = api.state().checked;
      const checked = kind === 'checkbox' ? !was : kind === 'radio' ? true : was;
      if (checked !== was) {
        api.setState({ checked });
        api.emit('checkedChange', checked);
      }
      api.emit('menuSelect', { itemId: api.inputs().itemId ?? '', checked });
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  },
  inputsChanged: (api, prev) => {
    if (api.inputs().checked !== prev.checked) api.setState({ checked: !!api.inputs().checked });
  },
});

export const ribbonMenuSeparatorCore = defineCore<Record<string, unknown>, Record<string, never>, { root: RibbonBag }>({
  view: () => ({ root: connectRibbonMenuSeparator() }),
});

export const ribbonGalleryCore = defineCore<RibbonGalleryInputs, Record<string, never>, { view: RibbonItemView; columns: RibbonStyle }>({
  view: ({ inputs, hydrated }) => {
    const { columns, ...view } = connectRibbonGallery({ kind: 'gallery', inputs, hydrated, columns: inputs.columns ?? 4 });
    return { view, columns };
  },
});

export interface RibbonGalleryItemEvents {
  gallerySelect: RibbonItemClickEventDetail;
}

export const ribbonGalleryItemCore = defineCore<RibbonGalleryItemInputs, Record<string, never>, { view: RibbonItemView }, RibbonGalleryItemEvents>({
  view: ({ inputs, hydrated }) => ({ view: connectRibbonGalleryItem({ inputs, hydrated }) }),
  attach: (api) => {
    const root = api.host;
    const onClick = (event: MouseEvent) => {
      const button = targetOf(event, '[data-ribbon-control]', (el) => el.closest('.ribbon-gallery-item') === root);
      if (button && enabled(button)) api.emit('gallerySelect', { itemId: api.inputs().itemId ?? '' });
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  },
});

export interface RibbonTemplateItemInputs {
  size?: RibbonItemInputs['size'];
}

export const ribbonTemplateItemCore = defineCore<RibbonTemplateItemInputs, Record<string, never>, { root: RibbonBag }>({
  view: ({ inputs }) => ({ root: connectRibbonTemplateItem({ size: inputs.size }) }),
});
