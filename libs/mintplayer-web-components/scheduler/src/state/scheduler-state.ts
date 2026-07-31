import {
  ViewType,
  SchedulerEvent,
  Resource,
  ResourceGroup,
  SchedulerOptions,
  DEFAULT_OPTIONS,
  PreviewEvent,
  DragState,
  TimeSlot,
  isResourceGroup,
} from '@mintplayer/web-components/scheduler-core';

/**
 * Collect every event authored *inside* a resource tree, stamping each with the
 * id of the resource that owns it.
 *
 * `resource.events` is authoring sugar: nesting is convenient to write, but a
 * second store to read from is what let week/day/month/year and timeline render
 * disjoint sets of events from the same component. Flattening here makes
 * `resourceId` the single authoritative link.
 */
function collectNestedEvents(
  items: (Resource | ResourceGroup)[],
  out: SchedulerEvent[] = [],
): SchedulerEvent[] {
  for (const item of items) {
    if (isResourceGroup(item)) {
      collectNestedEvents(item.children, out);
      continue;
    }
    for (const event of item.events ?? []) {
      out.push(event.resourceId ? event : { ...event, resourceId: item.id });
    }
  }
  return out;
}

/**
 * Merge the flat `events` input with events authored under resources.
 *
 * Flat entries win on id collision (they are the canonical store that drag and
 * keyboard commits write to); a collision means the same event was authored
 * twice, which was silently undefined before, so warn once in dev.
 */
function mergeEventSources(
  flat: SchedulerEvent[],
  resources: (Resource | ResourceGroup)[],
): SchedulerEvent[] {
  const nested = collectNestedEvents(resources);
  if (nested.length === 0) return flat;

  const byId = new Map<string, SchedulerEvent>();
  for (const event of nested) byId.set(event.id, event);

  const duplicates: string[] = [];
  for (const event of flat) {
    if (byId.has(event.id)) duplicates.push(event.id);
    byId.set(event.id, event);
  }

  if (duplicates.length > 0) {
    console.warn(
      `[mp-scheduler] ${duplicates.length} event id(s) appear in both the "events" input ` +
        `and under a resource; the "events" entry wins. Ids: ${duplicates.join(', ')}`,
    );
  }

  return [...byId.values()];
}

/**
 * Honour each group's authored `collapsed` flag on first sight.
 *
 * `ResourceGroup.collapsed` was declared on the model and read by nothing — the
 * live source is `state.collapsedGroups` — so a consumer authoring
 * `collapsed: true` was silently ignored. Groups already tracked keep the user's
 * current expand/collapse state; only groups new to us are seeded, so a
 * `resources` reassignment doesn't yank a group shut under the user.
 */
function seedCollapsedGroups(
  items: (Resource | ResourceGroup)[],
  current: Set<string>,
  seen: Set<string>,
): Set<string> {
  const next = new Set(current);
  const walk = (nodes: (Resource | ResourceGroup)[]): void => {
    for (const node of nodes) {
      if (!isResourceGroup(node)) continue;
      // Seed only the first time we see a group, so re-assigning `resources`
      // never yanks a group shut that the user has since expanded.
      if (!seen.has(node.id)) {
        seen.add(node.id);
        if (node.collapsed) next.add(node.id);
      }
      walk(node.children);
    }
  };
  walk(items);
  return next;
}

/** Group events by `resourceId`; the `null` key is the unassigned bucket. */
function indexByResource(events: SchedulerEvent[]): Map<string | null, SchedulerEvent[]> {
  const index = new Map<string | null, SchedulerEvent[]>();
  for (const event of events) {
    const key = event.resourceId ?? null;
    const bucket = index.get(key);
    if (bucket) bucket.push(event);
    else index.set(key, [event]);
  }
  return index;
}

/**
 * Internal state for the scheduler web component
 */
export interface SchedulerState {
  /** Current view type */
  view: ViewType;
  /** Current date (the date shown in the view) */
  date: Date;
  /**
   * All events — the single store every view reads. This is the merge of the
   * consumer's flat `events` input and any events authored under `resources`,
   * each stamped with its owning `resourceId`.
   */
  events: SchedulerEvent[];
  /**
   * `events` grouped by `resourceId`, rebuilt whenever `events` changes. The
   * `null` key holds events with no resource (timeline's unassigned bucket).
   */
  eventsByResource: Map<string | null, SchedulerEvent[]>;
  /** Resources and resource groups */
  resources: (Resource | ResourceGroup)[];
  /** Configuration options */
  options: SchedulerOptions;
  /** Currently selected event */
  selectedEvent: SchedulerEvent | null;
  /** Currently hovered event */
  hoveredEvent: SchedulerEvent | null;
  /** Currently hovered time slot */
  hoveredSlot: TimeSlot | null;
  /** Current drag operation state */
  dragState: DragState | null;
  /** Preview event during drag operations */
  previewEvent: PreviewEvent | null;
  /** Collapsed resource group IDs */
  collapsedGroups: Set<string>;
  /** Whether mouse button is pressed */
  isMouseDown: boolean;
  /** Loading state */
  isLoading: boolean;

  // --- Keyboard grid navigation (PRD scheduler-keyboard-grid-nav) ---
  /** Currently keyboard-focused cell. Drives roving tabindex inside the grid. */
  focusedCell: TimeSlot | null;
  /** Resource pinned to the focused cell (timeline view only). */
  focusedResourceId: string | null;
  /** The cell where the user first held Shift to begin a range selection. */
  selectionAnchor: TimeSlot | null;
  /** Current end-cell of the keyboard-driven selection. Range spans from the
   *  earliest cell.start to the latest cell.end across both anchor and extent. */
  selectionExtent: TimeSlot | null;
  /** Resource pinned at the anchor (timeline only); cross-resource selection is intentionally ignored (PRD D1). */
  selectionResourceId: string | null;
  /** ID of the event currently in keyboard move-mode (PRD §6.6). Drives `aria-pressed` on the event button. */
  keyboardMoveEventId: string | null;

  // --- Phase B (PRD scheduler-controlled-selection §5) ---
  /**
   * Keyboard-focused day on month-view, or first-of-month on year-view.
   * Distinct from `focusedCell` (which carries a slot range), because month-
   * and year-view cells aren't time slots — month cells are whole days, year
   * cells are whole months.
   */
  focusedDate: Date | null;
}

/**
 * Create initial scheduler state
 */
export function createInitialState(
  options: Partial<SchedulerOptions> = {}
): SchedulerState {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  return {
    view: mergedOptions.initialView,
    date: mergedOptions.initialDate,
    events: [],
    eventsByResource: new Map(),
    resources: [],
    options: mergedOptions,
    selectedEvent: null,
    hoveredEvent: null,
    hoveredSlot: null,
    dragState: null,
    previewEvent: null,
    collapsedGroups: new Set(),
    isMouseDown: false,
    isLoading: false,
    focusedCell: null,
    focusedResourceId: null,
    selectionAnchor: null,
    selectionExtent: null,
    selectionResourceId: null,
    keyboardMoveEventId: null,
    focusedDate: null,
  };
}

/**
 * State update function type
 */
export type StateUpdater = (state: SchedulerState) => Partial<SchedulerState>;

/**
 * State manager for the scheduler
 */
export class SchedulerStateManager {
  private state: SchedulerState;
  private listeners: Set<(state: SchedulerState) => void> = new Set();

  constructor(initialOptions: Partial<SchedulerOptions> = {}) {
    this.state = createInitialState(initialOptions);
  }

  /**
   * Get current state
   */
  getState(): SchedulerState {
    return this.state;
  }

  /**
   * Update state with partial update or updater function
   */
  setState(update: Partial<SchedulerState> | StateUpdater): void {
    const partialUpdate =
      typeof update === 'function' ? update(this.state) : update;

    const next = { ...this.state, ...partialUpdate };
    // Rebuild the resource index only when the event list identity changes, so
    // drag frames (which touch previewEvent every rAF) don't pay for it.
    if (next.events !== this.state.events || !this.state.eventsByResource) {
      next.eventsByResource = indexByResource(next.events);
    }
    this.state = next;
    this.notifyListeners();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: SchedulerState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  // Convenience methods for common state updates

  /**
   * Set the current view
   */
  setView(view: ViewType): void {
    this.setState({ view });
  }

  /**
   * Set the current date
   */
  setDate(date: Date): void {
    this.setState({ date });
  }

  /**
   * The consumer's flat `events` input, kept verbatim so re-merging on a
   * `resources` change doesn't fold previously-nested events into it.
   */
  private flatEventsInput: SchedulerEvent[] = [];

  /**
   * Set events. The stored `events` is the MERGE of this input and any events
   * authored under resources — every view reads that one list.
   */
  setEvents(events: SchedulerEvent[]): void {
    this.flatEventsInput = events;
    this.setState((state) => ({
      events: mergeEventSources(events, state.resources),
    }));
  }

  /**
   * Add an event. Lands in the single store regardless of whether it carries a
   * `resourceId`, so a timeline-created event is no longer invisible.
   */
  addEvent(event: SchedulerEvent): void {
    this.flatEventsInput = [...this.flatEventsInput, event];
    this.setState((state) => ({
      events: [...state.events, event],
    }));
  }

  /**
   * Update an event. One store, so no double-write: a move across resource rows
   * is now a `resourceId` reassignment rather than a splice between two arrays.
   */
  updateEvent(event: SchedulerEvent): void {
    this.flatEventsInput = this.flatEventsInput.map((e) =>
      e.id === event.id ? event : e,
    );
    this.setState((state) => ({
      events: state.events.map((e) => (e.id === event.id ? event : e)),
    }));
  }

  /**
   * Remove an event. Previously filtered the flat list only, so a
   * resource-nested event removed through the public API kept rendering.
   */
  removeEvent(eventId: string): void {
    this.flatEventsInput = this.flatEventsInput.filter((e) => e.id !== eventId);
    this.setState((state) => ({
      events: state.events.filter((e) => e.id !== eventId),
    }));
  }

  /**
   * Set resources. Re-merges so events authored under the new tree become
   * visible in every view, and honours each group's authored `collapsed` flag
   * (previously declared on the model and read by nothing).
   */
  setResources(resources: (Resource | ResourceGroup)[]): void {
    this.setState((state) => ({
      resources,
      events: mergeEventSources(this.flatEventsInput, resources),
      collapsedGroups: seedCollapsedGroups(
        resources,
        state.collapsedGroups,
        this.seededGroupIds,
      ),
    }));
  }

  /** Per-instance: group ids already seeded from their authored `collapsed`. */
  private readonly seededGroupIds = new Set<string>();

  /**
   * Toggle resource group collapse
   */
  toggleGroupCollapse(groupId: string): void {
    this.setState((state) => {
      const newCollapsed = new Set(state.collapsedGroups);
      if (newCollapsed.has(groupId)) {
        newCollapsed.delete(groupId);
      } else {
        newCollapsed.add(groupId);
      }
      return { collapsedGroups: newCollapsed };
    });
  }

  /**
   * Set selected event
   */
  setSelectedEvent(event: SchedulerEvent | null): void {
    this.setState({ selectedEvent: event });
  }

  /**
   * Set hovered event
   */
  setHoveredEvent(event: SchedulerEvent | null): void {
    this.setState({ hoveredEvent: event });
  }

  /**
   * Set hovered slot
   */
  setHoveredSlot(slot: TimeSlot | null): void {
    this.setState({ hoveredSlot: slot });
  }

  /**
   * Start a drag operation
   */
  startDrag(dragState: DragState): void {
    this.setState({
      dragState,
      previewEvent: dragState.preview,
      isMouseDown: true,
    });
  }

  /**
   * Update drag operation
   */
  updateDrag(currentSlot: TimeSlot, preview: PreviewEvent): void {
    this.setState((state) => ({
      dragState: state.dragState
        ? { ...state.dragState, currentSlot, preview }
        : null,
      previewEvent: preview,
    }));
  }

  /**
   * End drag operation
   */
  endDrag(): void {
    this.setState({
      dragState: null,
      previewEvent: null,
      isMouseDown: false,
    });
  }

  /**
   * Set mouse down state
   */
  setMouseDown(isMouseDown: boolean): void {
    this.setState({ isMouseDown });
  }

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean): void {
    this.setState({ isLoading });
  }

  /**
   * Update options
   */
  setOptions(options: Partial<SchedulerOptions>): void {
    this.setState((state) => ({
      options: { ...state.options, ...options },
    }));
  }

  /**
   * Navigate to next period
   */
  next(): void {
    this.setState((state) => {
      const newDate = new Date(state.date);
      switch (state.view) {
        case 'year':
          newDate.setFullYear(newDate.getFullYear() + 1);
          break;
        case 'month':
          newDate.setMonth(newDate.getMonth() + 1);
          break;
        case 'week':
        case 'timeline':
          newDate.setDate(newDate.getDate() + 7);
          break;
        case 'day':
          newDate.setDate(newDate.getDate() + 1);
          break;
      }
      return { date: newDate };
    });
  }

  /**
   * Navigate to previous period
   */
  prev(): void {
    this.setState((state) => {
      const newDate = new Date(state.date);
      switch (state.view) {
        case 'year':
          newDate.setFullYear(newDate.getFullYear() - 1);
          break;
        case 'month':
          newDate.setMonth(newDate.getMonth() - 1);
          break;
        case 'week':
        case 'timeline':
          newDate.setDate(newDate.getDate() - 7);
          break;
        case 'day':
          newDate.setDate(newDate.getDate() - 1);
          break;
      }
      return { date: newDate };
    });
  }

  /**
   * Navigate to today
   */
  today(): void {
    this.setState({ date: new Date() });
  }

  /**
   * Navigate to a specific date
   */
  gotoDate(date: Date): void {
    this.setState({ date });
  }

  /**
   * Move the keyboard focus to a cell. Setting `clearSelection` (default)
   * also drops any active range selection — used for plain Arrow nav, where
   * Shift would have stayed held to keep the range alive.
   */
  setFocusedCell(
    cell: TimeSlot | null,
    resourceId: string | null = null,
    clearSelection: boolean = true,
  ): void {
    if (clearSelection) {
      this.setState({
        focusedCell: cell,
        focusedResourceId: resourceId,
        selectionAnchor: null,
        selectionExtent: null,
        selectionResourceId: null,
      });
    } else {
      this.setState({
        focusedCell: cell,
        focusedResourceId: resourceId,
      });
    }
  }

  /**
   * Begin or extend a range selection. Anchor is set on first call (when
   * Shift is first held), pinned at the *previously-focused* cell. Extent
   * moves with each subsequent Shift+Arrow.
   */
  extendSelection(
    extent: TimeSlot,
    resourceId: string | null = null,
  ): void {
    this.setState((state) => {
      const anchor = state.selectionAnchor ?? state.focusedCell ?? extent;
      const pinnedResource =
        state.selectionResourceId ?? state.focusedResourceId ?? resourceId;
      return {
        selectionAnchor: anchor,
        selectionExtent: extent,
        selectionResourceId: pinnedResource,
      };
    });
  }

  /**
   * Clear any active range selection without touching the focused cell.
   */
  clearSelection(): void {
    this.setState({
      selectionAnchor: null,
      selectionExtent: null,
      selectionResourceId: null,
    });
  }

  /**
   * Move the keyboard focus to a calendar date — used by month and year views
   * (PRD scheduler-controlled-selection §5). Pass `null` to clear.
   */
  setFocusedDate(date: Date | null): void {
    this.setState({ focusedDate: date });
  }
}
