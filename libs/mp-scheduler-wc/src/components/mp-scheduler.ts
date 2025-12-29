import {
  ViewType,
  SchedulerEvent,
  Resource,
  ResourceGroup,
  SchedulerOptions,
  TimeSlot,
  dateService,
  generateEventId,
} from '@mintplayer/scheduler-core';
import { SchedulerStateManager, SchedulerState } from '../state/scheduler-state';
import { BaseView } from '../views/base-view';
import { YearView } from '../views/year-view';
import { MonthView } from '../views/month-view';
import { WeekView } from '../views/week-view';
import { DayView } from '../views/day-view';
import { TimelineView } from '../views/timeline-view';
import { schedulerStyles } from '../styles/scheduler.styles';
import { DragManager, PointerTarget, DragCompletionResult } from '../drag';
import { InputHandler, NormalizedPointerEvent } from '../input';
import { SchedulerEventEmitter } from '../events';

/**
 * MpScheduler Web Component
 *
 * A fully-featured scheduler/calendar component.
 * Refactored for clarity with separated concerns:
 * - DragManager: Handles all drag operations
 * - InputHandler: Normalizes mouse/touch input
 * - SchedulerEventEmitter: Dispatches custom events
 */
export class MpScheduler extends HTMLElement {
  static observedAttributes = [
    'view',
    'date',
    'locale',
    'first-day-of-week',
    'slot-duration',
    'time-format',
    'editable',
    'selectable',
  ];

  private shadow: ShadowRoot;
  private stateManager: SchedulerStateManager;
  private currentView: BaseView | null = null;
  private currentViewType: ViewType | null = null;
  private contentContainer: HTMLElement | null = null;

  // Managers
  private dragManager: DragManager;
  private inputHandler: InputHandler;
  private eventEmitter: SchedulerEventEmitter;

  // Track previous state for change detection
  private previousView: ViewType | null = null;
  private previousDate: Date | null = null;
  private previousSelectedEventId: string | null = null;

  // RAF scheduling for drag updates
  private pendingDragUpdate: number | null = null;
  private latestDragState: SchedulerState | null = null;

  // Keyboard handler
  private boundHandleKeyDown: (e: KeyboardEvent) => void;

  // Now indicator update timer
  private nowIndicatorTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'open' });
    this.stateManager = new SchedulerStateManager();
    this.eventEmitter = new SchedulerEventEmitter(this);

    // Initialize drag manager
    this.dragManager = new DragManager(this.stateManager);
    this.dragManager.setSlotResolver((x, y) => this.getSlotAtPosition(x, y));

    // Initialize input handler
    this.inputHandler = new InputHandler(
      {
        shadowRoot: this.shadow,
        getEventById: (id) => this.getEventById(id),
        isEditable: () => this.stateManager.getState().options.editable ?? true,
        isSelectable: () => this.stateManager.getState().options.selectable ?? true,
      },
      {
        onPointerDown: (pointer, target, immediate) => this.handlePointerDown(pointer, target, immediate),
        onPointerMove: (pointer) => this.handlePointerMove(pointer),
        onPointerUp: (pointer) => this.handlePointerUp(pointer),
        onClick: (pointer, target) => this.handleClick(pointer, target),
        onDoubleClick: (pointer, target) => this.handleDoubleClick(pointer, target),
        getScrollContainer: () => this.contentContainer,
      }
    );

    // Bind keyboard handler
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);

    // Subscribe to state changes
    this.stateManager.subscribe((state) => this.onStateChange(state));
  }

  connectedCallback(): void {
    this.render();
    this.inputHandler.attach();
    this.addEventListener('keydown', this.boundHandleKeyDown);

    // Start now indicator update timer (every minute)
    this.startNowIndicatorTimer();
  }

  disconnectedCallback(): void {
    this.inputHandler.detach();
    this.removeEventListener('keydown', this.boundHandleKeyDown);
    this.currentView?.destroy();
    this.dragManager.destroy();

    // Stop now indicator timer
    this.stopNowIndicatorTimer();

    // Cancel any pending RAF
    if (this.pendingDragUpdate !== null) {
      cancelAnimationFrame(this.pendingDragUpdate);
      this.pendingDragUpdate = null;
    }
    this.latestDragState = null;
  }

  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (oldValue === newValue) return;

    switch (name) {
      case 'view':
        if (newValue && ['year', 'month', 'week', 'day', 'timeline'].includes(newValue)) {
          this.stateManager.setView(newValue as ViewType);
        }
        break;
      case 'date':
        if (newValue) {
          this.stateManager.setDate(new Date(newValue));
        }
        break;
      case 'locale':
        if (newValue) {
          this.stateManager.setOptions({ locale: newValue });
        }
        break;
      case 'first-day-of-week':
        if (newValue) {
          const day = parseInt(newValue, 10);
          if (day >= 0 && day <= 6) {
            this.stateManager.setOptions({
              firstDayOfWeek: day as 0 | 1 | 2 | 3 | 4 | 5 | 6,
            });
          }
        }
        break;
      case 'slot-duration':
        if (newValue) {
          this.stateManager.setOptions({ slotDuration: parseInt(newValue, 10) });
        }
        break;
      case 'time-format':
        if (newValue && (newValue === '12h' || newValue === '24h')) {
          this.stateManager.setOptions({ timeFormat: newValue });
        }
        break;
      case 'editable':
        this.stateManager.setOptions({ editable: newValue !== 'false' });
        break;
      case 'selectable':
        this.stateManager.setOptions({ selectable: newValue !== 'false' });
        break;
    }
  }

  // ============================================
  // Public API
  // ============================================

  get view(): ViewType {
    return this.stateManager.getState().view;
  }

  set view(value: ViewType) {
    this.stateManager.setView(value);
  }

  get date(): Date {
    return this.stateManager.getState().date;
  }

  set date(value: Date) {
    this.stateManager.setDate(value);
  }

  get events(): SchedulerEvent[] {
    return this.stateManager.getState().events;
  }

  set events(value: SchedulerEvent[]) {
    this.stateManager.setEvents(value);
  }

  get resources(): (Resource | ResourceGroup)[] {
    return this.stateManager.getState().resources;
  }

  set resources(value: (Resource | ResourceGroup)[]) {
    this.stateManager.setResources(value);
  }

  get options(): SchedulerOptions {
    return this.stateManager.getState().options;
  }

  set options(value: Partial<SchedulerOptions>) {
    this.stateManager.setOptions(value);
  }

  get selectedEvent(): SchedulerEvent | null {
    return this.stateManager.getState().selectedEvent;
  }

  set selectedEvent(value: SchedulerEvent | null) {
    this.stateManager.setSelectedEvent(value);
  }

  get selectedRange(): { start: Date; end: Date } | null {
    const state = this.stateManager.getState();
    if (state.previewEvent) {
      return { start: state.previewEvent.start, end: state.previewEvent.end };
    }
    return null;
  }

  next(): void {
    this.stateManager.next();
  }

  prev(): void {
    this.stateManager.prev();
  }

  today(): void {
    this.stateManager.today();
  }

  gotoDate(date: Date): void {
    this.stateManager.gotoDate(date);
  }

  changeView(view: ViewType): void {
    this.stateManager.setView(view);
  }

  addEvent(event: SchedulerEvent): void {
    this.stateManager.addEvent(event);
  }

  updateEvent(event: SchedulerEvent): void {
    this.stateManager.updateEvent(event);
  }

  removeEvent(eventId: string): void {
    this.stateManager.removeEvent(eventId);
  }

  getEventById(eventId: string): SchedulerEvent | null {
    return this.events.find((e) => e.id === eventId) ?? null;
  }

  refetchEvents(): void {
    this.currentView?.update(this.stateManager.getState());
  }

  // ============================================
  // Rendering
  // ============================================

  private render(): void {
    const style = document.createElement('style');
    style.textContent = schedulerStyles;
    this.shadow.appendChild(style);

    const container = document.createElement('div');
    container.className = 'scheduler-container';

    const header = this.createHeader();
    container.appendChild(header);

    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'scheduler-content';
    container.appendChild(this.contentContainer);

    this.shadow.appendChild(container);
    this.renderView();
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('header');
    header.className = 'scheduler-header';

    // Navigation
    const nav = document.createElement('nav');
    nav.className = 'scheduler-nav';

    const prevBtn = document.createElement('button');
    prevBtn.textContent = '‹';
    prevBtn.title = 'Previous';
    prevBtn.addEventListener('click', () => this.prev());

    const nextBtn = document.createElement('button');
    nextBtn.textContent = '›';
    nextBtn.title = 'Next';
    nextBtn.addEventListener('click', () => this.next());

    const todayBtn = document.createElement('button');
    todayBtn.textContent = 'Today';
    todayBtn.addEventListener('click', () => this.today());

    nav.appendChild(prevBtn);
    nav.appendChild(nextBtn);
    nav.appendChild(todayBtn);

    // Title
    const title = document.createElement('div');
    title.className = 'scheduler-title';
    this.updateTitle(title);

    // View switcher
    const viewSwitcher = document.createElement('div');
    viewSwitcher.className = 'scheduler-view-switcher';

    const views: { key: ViewType; label: string }[] = [
      { key: 'year', label: 'Year' },
      { key: 'month', label: 'Month' },
      { key: 'week', label: 'Week' },
      { key: 'day', label: 'Day' },
      { key: 'timeline', label: 'Timeline' },
    ];

    for (const { key, label } of views) {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.dataset['view'] = key;
      if (key === this.view) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => this.changeView(key));
      viewSwitcher.appendChild(btn);
    }

    header.appendChild(nav);
    header.appendChild(title);
    header.appendChild(viewSwitcher);

    return header;
  }

  private updateTitle(titleEl?: HTMLElement): void {
    const title = titleEl ?? this.shadow.querySelector('.scheduler-title');
    if (!title) return;

    const state = this.stateManager.getState();
    const { date, view, options } = state;

    let titleText = '';
    switch (view) {
      case 'year':
        titleText = date.getFullYear().toString();
        break;
      case 'month':
        titleText = dateService.formatDate(date, options.locale, {
          month: 'long',
          year: 'numeric',
        });
        break;
      case 'week':
      case 'timeline': {
        const weekStart = dateService.getWeekStart(date, options.firstDayOfWeek);
        const weekEnd = dateService.addDays(weekStart, 6);
        titleText = `${dateService.formatDate(weekStart, options.locale, {
          month: 'short',
          day: 'numeric',
        })} - ${dateService.formatDate(weekEnd, options.locale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`;
        break;
      }
      case 'day':
        titleText = dateService.formatDate(date, options.locale, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        break;
    }

    title.textContent = titleText;
  }

  private renderView(): void {
    if (!this.contentContainer) return;

    this.currentView?.destroy();

    const state = this.stateManager.getState();

    switch (state.view) {
      case 'year':
        this.currentView = new YearView(this.contentContainer, state);
        this.currentViewType = 'year';
        break;
      case 'month':
        this.currentView = new MonthView(this.contentContainer, state);
        this.currentViewType = 'month';
        break;
      case 'week':
        this.currentView = new WeekView(this.contentContainer, state);
        this.currentViewType = 'week';
        break;
      case 'day':
        this.currentView = new DayView(this.contentContainer, state);
        this.currentViewType = 'day';
        break;
      case 'timeline':
        this.currentView = new TimelineView(this.contentContainer, state);
        this.currentViewType = 'timeline';
        break;
    }

    this.currentView?.render();
  }

  // ============================================
  // State Change Handling
  // ============================================

  private onStateChange(state: SchedulerState): void {
    this.detectAndEmitChanges(state);
    this.updateUI(state);
  }

  private detectAndEmitChanges(state: SchedulerState): void {
    const viewChanged =
      this.previousView !== null && this.previousView !== state.view;
    const dateChanged =
      this.previousDate !== null &&
      this.previousDate.getTime() !== state.date.getTime();
    const selectedEventId = state.selectedEvent?.id ?? null;
    const selectionChanged =
      this.previousSelectedEventId !== null &&
      this.previousSelectedEventId !== selectedEventId;

    if (viewChanged || dateChanged) {
      this.eventEmitter.emitViewChange(state.view, state.date);
    }

    if (selectionChanged) {
      this.eventEmitter.emitSelectionChange(state.selectedEvent);
    }

    this.previousView = state.view;
    this.previousDate = new Date(state.date);
    this.previousSelectedEventId = selectedEventId;
  }

  private updateUI(state: SchedulerState): void {
    this.updateTitle();

    // Update view switcher active state
    const buttons = this.shadow.querySelectorAll('.scheduler-view-switcher button');
    buttons.forEach((btn) => {
      const btnEl = btn as HTMLButtonElement;
      btnEl.classList.toggle('active', btnEl.dataset['view'] === state.view);
    });

    // Update or re-render view
    if (this.currentView) {
      if (this.currentViewType !== state.view) {
        this.renderView();
      } else if (state.dragState || state.previewEvent) {
        this.scheduleDragUpdate(state);
      } else {
        this.currentView.update(state);
      }
    }
  }

  private scheduleDragUpdate(state: SchedulerState): void {
    this.latestDragState = state;

    if (this.pendingDragUpdate !== null) {
      return;
    }

    this.pendingDragUpdate = requestAnimationFrame(() => {
      this.pendingDragUpdate = null;

      const stateToApply = this.latestDragState;
      this.latestDragState = null;

      if (stateToApply && this.currentView) {
        this.currentView.update(stateToApply);
      }
    });
  }

  // ============================================
  // Input Handling (Callbacks from InputHandler)
  // ============================================

  private handlePointerDown(
    pointer: NormalizedPointerEvent,
    target: PointerTarget,
    immediate?: boolean
  ): void {
    this.dragManager.handlePointerDown(pointer, target, immediate);
  }

  private handlePointerMove(pointer: NormalizedPointerEvent): void {
    this.dragManager.handlePointerMove(pointer);
  }

  private handlePointerUp(pointer: NormalizedPointerEvent): void {
    const result = this.dragManager.handlePointerUp(pointer);

    if (result) {
      this.handleDragComplete(result, pointer.originalEvent);
    }
  }

  private handleDragComplete(
    result: DragCompletionResult,
    originalEvent: Event
  ): void {
    if (result.wasClick) {
      // It was a click, not a drag
      if (result.event) {
        this.stateManager.setSelectedEvent(result.event);
        this.eventEmitter.emitEventClick(result.event, originalEvent);
      }
      return;
    }

    // Handle actual drag completion
    switch (result.type) {
      case 'create': {
        const newEvent: SchedulerEvent = {
          id: generateEventId(),
          title: 'New Event',
          start: result.preview.start,
          end: result.preview.end,
          color: '#3788d8',
        };
        this.stateManager.addEvent(newEvent);
        this.eventEmitter.emitEventCreate(newEvent, originalEvent);
        break;
      }

      case 'move':
      case 'resize-start':
      case 'resize-end': {
        if (result.event && result.originalEvent) {
          const updatedEvent: SchedulerEvent = {
            ...result.event,
            start: result.preview.start,
            end: result.preview.end,
          };
          this.stateManager.updateEvent(updatedEvent);
          this.eventEmitter.emitEventUpdate(
            updatedEvent,
            result.originalEvent,
            originalEvent
          );
        }
        break;
      }
    }
  }

  private handleClick(
    pointer: NormalizedPointerEvent,
    target: PointerTarget
  ): void {
    const targetEl = pointer.target;

    // Group toggle
    const toggle = targetEl.closest('.expand-toggle') as HTMLElement;
    if (toggle) {
      const groupId = toggle.dataset['groupId'];
      if (groupId) {
        this.stateManager.toggleGroupCollapse(groupId);
        this.renderView();
        return;
      }
    }

    // Date click
    const dayEl = targetEl.closest('[data-date]') as HTMLElement;
    if (dayEl) {
      const dateStr = dayEl.dataset['date'];
      if (dateStr) {
        this.eventEmitter.emitDateClick(new Date(dateStr), pointer.originalEvent);
      }
    }

    // Month click in year view
    const monthHeader = targetEl.closest(
      '.scheduler-year-month-header'
    ) as HTMLElement;
    if (monthHeader) {
      const monthStr = monthHeader.dataset['month'];
      if (monthStr) {
        this.stateManager.setDate(new Date(monthStr));
        this.stateManager.setView('month');
      }
    }

    // More link click
    const moreLink = targetEl.closest('.scheduler-more-link') as HTMLElement;
    if (moreLink) {
      const dateStr = moreLink.dataset['date'];
      if (dateStr) {
        this.stateManager.setDate(new Date(dateStr));
        this.stateManager.setView('day');
      }
    }
  }

  private handleDoubleClick(
    pointer: NormalizedPointerEvent,
    target: PointerTarget
  ): void {
    if (target.type === 'event' && target.event) {
      this.eventEmitter.emitEventDblClick(target.event, pointer.originalEvent);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const state = this.stateManager.getState();

    switch (e.key) {
      case 'ArrowLeft':
        this.prev();
        e.preventDefault();
        break;
      case 'ArrowRight':
        this.next();
        e.preventDefault();
        break;
      case 't':
      case 'T':
        this.today();
        e.preventDefault();
        break;
      case 'y':
      case 'Y':
        this.changeView('year');
        e.preventDefault();
        break;
      case 'm':
      case 'M':
        this.changeView('month');
        e.preventDefault();
        break;
      case 'w':
      case 'W':
        this.changeView('week');
        e.preventDefault();
        break;
      case 'd':
      case 'D':
        this.changeView('day');
        e.preventDefault();
        break;
      case 'Delete':
      case 'Backspace':
        if (state.selectedEvent) {
          this.eventEmitter.emitEventDelete(state.selectedEvent);
        }
        break;
      case 'Escape':
        if (this.dragManager.isDragging()) {
          this.dragManager.cancel();
        }
        break;
    }
  }

  // ============================================
  // Now Indicator Timer
  // ============================================

  private startNowIndicatorTimer(): void {
    // Update every minute (60000ms)
    this.nowIndicatorTimer = setInterval(() => {
      this.currentView?.updateNowIndicator();
    }, 60000);
  }

  private stopNowIndicatorTimer(): void {
    if (this.nowIndicatorTimer !== null) {
      clearInterval(this.nowIndicatorTimer);
      this.nowIndicatorTimer = null;
    }
  }

  // ============================================
  // Slot Resolution
  // ============================================

  private getSlotAtPosition(clientX: number, clientY: number): TimeSlot | null {
    const elements = this.shadow.elementsFromPoint(clientX, clientY);
    const slotEl = elements.find((el) =>
      el.matches('.scheduler-time-slot, .scheduler-timeline-slot')
    ) as HTMLElement | undefined;

    return slotEl ? this.getSlotFromElement(slotEl) : null;
  }

  private getSlotFromElement(el: HTMLElement): TimeSlot | null {
    const startStr = el.dataset['start'];
    const endStr = el.dataset['end'];

    if (!startStr || !endStr) return null;

    return {
      start: new Date(startStr),
      end: new Date(endStr),
    };
  }
}

// Register the custom element
if (typeof customElements !== 'undefined' && !customElements.get('mp-scheduler')) {
  customElements.define('mp-scheduler', MpScheduler);
}
