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
} from '@mintplayer/scheduler-core';

/**
 * Internal state for the scheduler web component
 */
export interface SchedulerState {
  /** Current view type */
  view: ViewType;
  /** Current date (the date shown in the view) */
  date: Date;
  /** All events */
  events: SchedulerEvent[];
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

    this.state = { ...this.state, ...partialUpdate };
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
   * Set events
   */
  setEvents(events: SchedulerEvent[]): void {
    this.setState({ events });
  }

  /**
   * Add an event
   */
  addEvent(event: SchedulerEvent): void {
    this.setState((state) => ({
      events: [...state.events, event],
    }));
  }

  /**
   * Update an event
   */
  updateEvent(event: SchedulerEvent): void {
    this.setState((state) => ({
      events: state.events.map((e) => (e.id === event.id ? event : e)),
    }));
  }

  /**
   * Remove an event
   */
  removeEvent(eventId: string): void {
    this.setState((state) => ({
      events: state.events.filter((e) => e.id !== eventId),
    }));
  }

  /**
   * Set resources
   */
  setResources(resources: (Resource | ResourceGroup)[]): void {
    this.setState({ resources });
  }

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
}
