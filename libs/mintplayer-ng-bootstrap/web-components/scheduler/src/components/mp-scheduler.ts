import { LitElement, html, type TemplateResult } from 'lit';
import { LiveAnnouncerController } from '@mintplayer/ng-bootstrap/web-components/a11y';
import {
  ViewType,
  SchedulerEvent,
  Resource,
  ResourceGroup,
  SchedulerOptions,
  TimeSlot,
  dateService,
  resourceService,
  isResource,
} from '@mintplayer/ng-bootstrap/web-components/scheduler-core';
import { SchedulerStateManager, SchedulerState } from '../state/scheduler-state';
import {
  BaseView,
  selectionRange,
  formatCellAnnouncement,
  formatSelectionAnnouncement,
  formatMoveAnnouncement,
  formatResizeAnnouncement,
} from '../views/base-view';
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
export class MpScheduler extends LitElement {
  static override styles = [schedulerStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'view',
      'date',
      'locale',
      'first-day-of-week',
      'slot-duration',
      'time-format',
      'editable',
      'selectable',
    ];
  }

  private stateManager: SchedulerStateManager;
  private currentView: BaseView | null = null;
  private currentViewType: ViewType | null = null;
  private contentContainer: HTMLElement | null = null;

  // Managers
  private dragManager: DragManager;
  private inputHandler: InputHandler | null = null;
  private eventEmitter: SchedulerEventEmitter;

  // Track previous state for change detection
  private previousView: ViewType | null = null;
  private previousDate: Date | null = null;
  private previousSelectedEventId: string | null = null;
  // Sentinel-keyed previous range so we can fire selection-change when the
  // time-range selection mutates (anchor/extent/resourceId). `__init__`
  // distinguishes "haven't observed yet" from "currently null" so the very
  // first emission isn't suppressed.
  private previousRangeKey: string | null = '__init__';

  // RAF scheduling for drag updates
  private pendingDragUpdate: number | null = null;
  private latestDragState: SchedulerState | null = null;

  // Keyboard handler
  private boundHandleKeyDown: (e: KeyboardEvent) => void;
  private boundHandleFocusIn: (e: FocusEvent) => void;

  // Now indicator update timer
  private nowIndicatorTimer: ReturnType<typeof setInterval> | null = null;

  private readonly liveAnnouncer = new LiveAnnouncerController(this);

  constructor() {
    super();

    this.stateManager = new SchedulerStateManager();
    this.eventEmitter = new SchedulerEventEmitter(this);

    // Initialize drag manager (input handler is deferred to firstUpdated()
    // because it needs the shadow root, which Lit creates after construction).
    this.dragManager = new DragManager(this.stateManager);
    this.dragManager.setSlotResolver((x, y) => this.getSlotAtPosition(x, y));

    // Bind keyboard handler
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);
    this.boundHandleFocusIn = this.handleFocusIn.bind(this);

    // Subscribe to state changes
    this.stateManager.subscribe((state) => this.onStateChange(state));
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.inputHandler) {
      this.inputHandler.attach();
    }
    this.addEventListener('keydown', this.boundHandleKeyDown);
    // focusin listener is registered in firstUpdated() once the shadowRoot exists.

    // Start now indicator update timer (every minute)
    this.startNowIndicatorTimer();
  }

  override disconnectedCallback(): void {
    this.inputHandler?.detach();
    this.removeEventListener('keydown', this.boundHandleKeyDown);
    this.shadowRoot?.removeEventListener('focusin', this.boundHandleFocusIn as EventListener);
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
    super.disconnectedCallback();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
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
    this.liveAnnouncer.announce(`View changed to ${view}.`);
  }

  /**
   * Clear the time-range selection and the focused-cell selection. Public
   * because — per PRD scheduler-controlled-selection — the WC no longer
   * auto-clears on commit; consumers call this from their `event-create`
   * handler if they want the post-create selection cleared.
   */
  clearSelection(): void {
    this.stateManager.clearSelection();
  }

  addEvent(event: SchedulerEvent): void {
    this.stateManager.addEvent(event);
    this.liveAnnouncer.announce(`Event ${event.title} added.`);
  }

  updateEvent(event: SchedulerEvent): void {
    this.stateManager.updateEvent(event);
    this.liveAnnouncer.announce(`Event ${event.title} updated.`);
  }

  removeEvent(eventId: string): void {
    const ev = this.getEventById(eventId);
    this.stateManager.removeEvent(eventId);
    if (ev) this.liveAnnouncer.announce(`Event ${ev.title} removed.`);
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

  override render(): TemplateResult {
    return html`
      <div class="scheduler-container">
        <header class="scheduler-header"></header>
        <div class="scheduler-content"></div>
      </div>
      ${this.liveAnnouncer.template()}
    `;
  }

  protected override firstUpdated(): void {
    const headerEl = this.shadowRoot!.querySelector('.scheduler-header') as HTMLElement;
    this.contentContainer = this.shadowRoot!.querySelector('.scheduler-content') as HTMLElement;

    this.populateHeader(headerEl);

    // Construct InputHandler now that shadowRoot is available, then attach.
    this.inputHandler = new InputHandler(
      {
        shadowRoot: this.shadowRoot!,
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
    this.inputHandler.attach();

    // focusin on shadowRoot so e.target is the actual focused element
    // (avoids cross-shadow retargeting back to the host). Cast — focusin
    // isn't in the typed ShadowRootEventMap but the runtime supports it.
    this.shadowRoot!.addEventListener('focusin', this.boundHandleFocusIn as EventListener);

    this.renderView();
  }

  private populateHeader(header: HTMLElement): void {
    // Navigation
    const nav = document.createElement('nav');
    nav.className = 'scheduler-nav';
    nav.setAttribute('aria-label', 'Scheduler navigation');

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.textContent = '‹';
    prevBtn.setAttribute('aria-label', 'Previous period');
    prevBtn.title = 'Previous';
    prevBtn.addEventListener('click', () => this.prev());

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.textContent = '›';
    nextBtn.setAttribute('aria-label', 'Next period');
    nextBtn.title = 'Next';
    nextBtn.addEventListener('click', () => this.next());

    const todayBtn = document.createElement('button');
    todayBtn.type = 'button';
    todayBtn.textContent = 'Today';
    todayBtn.setAttribute('aria-label', 'Jump to today');
    todayBtn.addEventListener('click', () => this.today());

    nav.appendChild(prevBtn);
    nav.appendChild(nextBtn);
    nav.appendChild(todayBtn);

    // Title — assertive live region so navigation announces the new period.
    const title = document.createElement('div');
    title.className = 'scheduler-title';
    title.setAttribute('aria-live', 'polite');
    title.setAttribute('aria-atomic', 'true');
    this.updateTitle(title);

    // View switcher — toolbar of toggle-buttons; aria-pressed mirrors active state.
    const viewSwitcher = document.createElement('div');
    viewSwitcher.className = 'scheduler-view-switcher';
    viewSwitcher.setAttribute('role', 'group');
    viewSwitcher.setAttribute('aria-label', 'Switch view');

    const views: { key: ViewType; label: string }[] = [
      { key: 'year', label: 'Year' },
      { key: 'month', label: 'Month' },
      { key: 'week', label: 'Week' },
      { key: 'day', label: 'Day' },
      { key: 'timeline', label: 'Timeline' },
    ];

    for (const { key, label } of views) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.dataset['view'] = key;
      const isActive = key === this.view;
      btn.setAttribute('aria-pressed', String(isActive));
      if (isActive) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => this.changeView(key));
      viewSwitcher.appendChild(btn);
    }

    header.appendChild(nav);
    header.appendChild(title);
    header.appendChild(viewSwitcher);
  }

  private updateTitle(titleEl?: HTMLElement): void {
    const title = titleEl ?? this.shadowRoot!.querySelector('.scheduler-title');
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
    const range = selectionRange(state);
    // Encode the range + resource into a single key so we fire selection-change
    // on any movement of anchor/extent/resourceId, including the transition
    // back to null (per PRD: consumers shouldn't have to poll).
    const rangeKey = range
      ? `${range.start.getTime()}-${range.end.getTime()}-${state.selectionResourceId ?? ''}`
      : null;
    const selectionChanged =
      this.previousSelectedEventId !== selectedEventId ||
      this.previousRangeKey !== rangeKey;

    if (viewChanged || dateChanged) {
      this.eventEmitter.emitViewChange(state.view, state.date);
    }

    if (selectionChanged) {
      this.eventEmitter.emitSelectionChange(
        state.selectedEvent,
        range,
        state.view,
        state.selectionResourceId ?? undefined,
      );
    }

    this.previousView = state.view;
    this.previousDate = new Date(state.date);
    this.previousSelectedEventId = selectedEventId;
    this.previousRangeKey = rangeKey;
  }

  private updateUI(state: SchedulerState): void {
    this.updateTitle();

    // Update view switcher active state — visual class + aria-pressed in lockstep.
    const buttons = this.shadowRoot!.querySelectorAll('.scheduler-view-switcher button');
    buttons.forEach((btn) => {
      const btnEl = btn as HTMLButtonElement;
      const isActive = btnEl.dataset['view'] === state.view;
      btnEl.classList.toggle('active', isActive);
      btnEl.setAttribute('aria-pressed', String(isActive));
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
        this.eventEmitter.emitEventSelected(result.event, originalEvent);
      }
      return;
    }

    // Handle actual drag completion
    switch (result.type) {
      case 'create': {
        // Per PRD scheduler-controlled-selection: the scheduler does not
        // construct or store the event itself — it emits the range as a
        // request, the consumer constructs the SchedulerEvent.
        const state = this.stateManager.getState();
        this.eventEmitter.emitEventCreate(
          { start: result.preview.start, end: result.preview.end },
          state.view,
          originalEvent,
          result.preview.resourceId,
        );
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

    // Event click — also drives the keyboard-move tab stop. The drag flow
    // already calls setSelectedEvent on commit, but a plain click on an
    // event needs to select it too so the focus model can land on it.
    if (target.type === 'event' && target.event) {
      this.stateManager.setSelectedEvent(target.event);
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

  /**
   * When focus lands on an event block (Tab, programmatic, or click), select
   * the event and emit `event-selected` for mouse-parity (PRD §6.5 D3). The
   * subsequent setSelectedEvent call routes through detectAndEmitChanges
   * which fires `selection-change`.
   *
   * `focusin` bubbles across shadow boundaries but `e.target` is retargeted
   * to the host. Use composedPath()[0] for the actual focused element.
   */
  private handleFocusIn(e: FocusEvent): void {
    const path = (e.composedPath?.() ?? []) as EventTarget[];
    const target = (path[0] ?? e.target) as HTMLElement | null;
    if (!target || !target.dataset) return;
    const eventId = target.dataset['eventId'];
    if (!eventId) return;
    if (!target.classList.contains('scheduler-event') &&
        !target.classList.contains('scheduler-timeline-event')) {
      return;
    }
    const ev = this.getEventById(eventId);
    if (!ev) return;
    if (this.stateManager.getState().selectedEvent?.id === ev.id) {
      // Already selected — Tab landed on the same event again. Don't re-emit
      // event-selected to avoid noise from programmatic focus restoration
      // (e.g. after move-mode commit re-focuses the moved event).
      return;
    }
    this.stateManager.setSelectedEvent(ev);
    this.eventEmitter.emitEventSelected(ev, e);
    // setSelectedEvent triggers a re-render that destroys the event's DOM
    // node (renderEvents tears down + rebuilds). Restore focus so subsequent
    // keypresses (Enter to enter move-mode, Delete to delete) still see the
    // event as the active element.
    requestAnimationFrame(() => {
      const sel = `[data-event-id="${this.cssEscape(ev.id)}"]`;
      const newEl = this.shadowRoot?.querySelector(sel) as HTMLElement | null;
      newEl?.focus({ preventScroll: true });
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Move-mode owns every key while active so arrows/Enter/Esc go to it.
    if (this.keyboardMove) {
      this.handleKeyboardMove(e);
      return;
    }

    // Cancel pointer drag with Escape regardless of focus.
    if (e.key === 'Escape' && this.dragManager.isDragging()) {
      this.dragManager.cancel();
      return;
    }

    // Alt+letter view shortcuts work from any focus (PRD D2). Bare letters
    // are no longer hot-keys — that frees them for future input surfaces.
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      if (this.handleAltShortcut(e)) return;
    }

    const kind = this.getFocusedKind();
    if (kind === 'cell') {
      this.handleCellKeyDown(e);
    } else if (kind === 'event') {
      this.handleEventKeyDown(e);
    }
  }

  private getFocusedKind(): 'cell' | 'event' | 'other' {
    const active = this.shadowRoot?.activeElement as HTMLElement | null;
    if (!active) return 'other';
    if (
      active.classList.contains('scheduler-time-slot') ||
      active.classList.contains('scheduler-timeline-slot')
    ) {
      return 'cell';
    }
    if (
      active.classList.contains('scheduler-event') ||
      active.classList.contains('scheduler-timeline-event')
    ) {
      return 'event';
    }
    return 'other';
  }

  private handleAltShortcut(e: KeyboardEvent): boolean {
    switch (e.key.toLowerCase()) {
      case 't': this.today(); e.preventDefault(); return true;
      case 'y': this.changeView('year'); e.preventDefault(); return true;
      case 'm': this.changeView('month'); e.preventDefault(); return true;
      case 'w': this.changeView('week'); e.preventDefault(); return true;
      case 'd': this.changeView('day'); e.preventDefault(); return true;
    }
    return false;
  }

  private handleEventKeyDown(e: KeyboardEvent): void {
    const state = this.stateManager.getState();
    const ev = state.selectedEvent;
    if (!ev) return;
    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        this.enterEventMoveMode(ev);
        return;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        this.eventEmitter.emitEventDelete(ev);
        return;
      case 'Escape':
        e.preventDefault();
        this.focusFocusedCell();
        return;
    }
  }

  private handleCellKeyDown(e: KeyboardEvent): void {
    const state = this.stateManager.getState();
    if (!state.focusedCell) this.initFocusedCellFromActive();
    const shift = e.shiftKey;
    const ctrl = e.ctrlKey || e.metaKey;
    // Arrow mapping is physical-direction-aware:
    //   week/day: time is vertical → ArrowUp/Down nudge time, ArrowLeft/Right
    //             walk days (week only).
    //   timeline: time is horizontal → ArrowLeft/Right nudge time,
    //             ArrowUp/Down walk resources (rows).
    const timelineLayout = state.view === 'timeline';
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        timelineLayout ? this.moveCellByResource(-1, shift) : this.moveCellByTime(-1, shift);
        break;
      case 'ArrowDown':
        e.preventDefault();
        timelineLayout ? this.moveCellByResource(+1, shift) : this.moveCellByTime(+1, shift);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        timelineLayout ? this.moveCellByTime(-1, shift) : this.moveCellByDay(-1, shift);
        break;
      case 'ArrowRight':
        e.preventDefault();
        timelineLayout ? this.moveCellByTime(+1, shift) : this.moveCellByDay(+1, shift);
        break;
      case 'Home':
        e.preventDefault();
        ctrl ? this.moveCellToViewExtreme('start', shift) : this.moveCellToColumnExtreme('start', shift);
        break;
      case 'End':
        e.preventDefault();
        ctrl ? this.moveCellToViewExtreme('end', shift) : this.moveCellToColumnExtreme('end', shift);
        break;
      case 'PageUp':     e.preventDefault(); this.moveCellByPeriod(-1); break;
      case 'PageDown':   e.preventDefault(); this.moveCellByPeriod(+1); break;
      case 'Enter':      e.preventDefault(); this.createEventFromCellOrSelection(e); break;
      case 'Escape':     e.preventDefault(); this.stateManager.clearSelection(); break;
    }
  }

  /**
   * If a cell is the active element but state.focusedCell is empty (e.g.
   * Tab landed on the fallback first cell), seed the state from the
   * active element's data attributes.
   */
  private initFocusedCellFromActive(): void {
    const active = this.shadowRoot?.activeElement as HTMLElement | null;
    if (!active) return;
    const startStr = active.dataset['start'];
    const endStr = active.dataset['end'];
    if (!startStr || !endStr) return;
    const cell: TimeSlot = { start: new Date(startStr), end: new Date(endStr) };
    const resourceId = active.dataset['resourceId'] ?? null;
    this.stateManager.setFocusedCell(cell, resourceId, true);
  }

  private moveCellByTime(direction: 1 | -1, extend: boolean): void {
    const state = this.stateManager.getState();
    const f = state.focusedCell;
    if (!f) return;
    const slotMs = (state.options.slotDuration ?? 1800) * 1000;
    const newStart = new Date(f.start.getTime() + direction * slotMs);
    const newEnd = new Date(newStart.getTime() + slotMs);
    if (!this.cellIsWithinView(newStart, state)) return;
    this.commitFocusMove({ start: newStart, end: newEnd }, state.focusedResourceId, extend);
  }

  /** Week view ArrowLeft/Right: ±1 day, same time-of-day. No-op on day view. */
  private moveCellByDay(direction: 1 | -1, extend: boolean): void {
    const state = this.stateManager.getState();
    const f = state.focusedCell;
    if (!f) return;
    if (state.view !== 'week') return;
    const slotMs = (state.options.slotDuration ?? 1800) * 1000;
    const newStart = new Date(f.start);
    newStart.setDate(newStart.getDate() + direction);
    const newEnd = new Date(newStart.getTime() + slotMs);
    if (!this.cellIsWithinView(newStart, state)) return;
    this.commitFocusMove({ start: newStart, end: newEnd }, null, extend);
  }

  /** Timeline ArrowUp/Down: ±1 resource, same time-of-day. PRD D1: cross-resource
   *  Shift+Arrow is intentionally ignored (resource is categorical). */
  private moveCellByResource(direction: 1 | -1, extend: boolean): void {
    const state = this.stateManager.getState();
    const f = state.focusedCell;
    if (!f) return;
    if (state.view !== 'timeline') return;
    if (extend) return;
    const next = this.adjacentResource(state.focusedResourceId, direction, state);
    if (!next) return;
    this.commitFocusMove(f, next, false);
  }

  private moveCellToColumnExtreme(end: 'start' | 'end', extend: boolean): void {
    const state = this.stateManager.getState();
    const f = state.focusedCell;
    if (!f) return;
    const day = new Date(f.start);
    day.setHours(0, 0, 0, 0);
    const slots = dateService.getTimeSlots(
      day,
      state.options.slotDuration,
      state.options.slotMinTime,
      state.options.slotMaxTime,
    );
    const target = end === 'start' ? slots[0] : slots[slots.length - 1];
    if (target) this.commitFocusMove(target, state.focusedResourceId, extend);
  }

  private moveCellToViewExtreme(end: 'start' | 'end', extend: boolean): void {
    const state = this.stateManager.getState();
    let target: TimeSlot | null = null;
    let resourceId: string | null = state.focusedResourceId;
    switch (state.view) {
      case 'day': {
        const slots = dateService.getTimeSlots(state.date, state.options.slotDuration, state.options.slotMinTime, state.options.slotMaxTime);
        target = end === 'start' ? slots[0] : slots[slots.length - 1];
        break;
      }
      case 'week': {
        const days = dateService.getWeekDays(state.date, state.options.firstDayOfWeek);
        const day = end === 'start' ? days[0] : days[6];
        const slots = dateService.getTimeSlots(day, state.options.slotDuration, state.options.slotMinTime, state.options.slotMaxTime);
        target = end === 'start' ? slots[0] : slots[slots.length - 1];
        break;
      }
      case 'timeline': {
        const flattened = resourceService.flatten(state.resources, state.collapsedGroups);
        const visible = flattened.filter((f) => f.visible && isResource(f.item));
        if (visible.length === 0) return;
        resourceId = end === 'start' ? visible[0].item.id : visible[visible.length - 1].item.id;
        const days = dateService.getWeekDays(state.date, state.options.firstDayOfWeek);
        const day = end === 'start' ? days[0] : days[6];
        const slots = dateService.getTimeSlots(day, state.options.slotDuration, state.options.slotMinTime, state.options.slotMaxTime);
        target = end === 'start' ? slots[0] : slots[slots.length - 1];
        break;
      }
    }
    if (target) this.commitFocusMove(target, resourceId, extend);
  }

  /**
   * PageUp/PageDown — advance one period (week or day) and re-focus the same
   * day-of-week + time-of-day in the new period. Selection is cleared since
   * crossing a period boundary breaks the linear-range invariant.
   */
  private moveCellByPeriod(direction: 1 | -1): void {
    const state = this.stateManager.getState();
    const f = state.focusedCell;
    const oldDate = state.date;
    if (direction > 0) this.next(); else this.prev();
    if (!f) return;
    const newState = this.stateManager.getState();
    let newStart: Date;
    if (newState.view === 'day') {
      newStart = new Date(newState.date);
      newStart.setHours(f.start.getHours(), f.start.getMinutes(), f.start.getSeconds(), 0);
    } else {
      // week / timeline — preserve day-of-week index.
      const oldDays = dateService.getWeekDays(oldDate, state.options.firstDayOfWeek);
      const newDays = dateService.getWeekDays(newState.date, newState.options.firstDayOfWeek);
      const oldIdx = oldDays.findIndex((d) => dateService.isSameDay(d, f.start));
      const targetDay = newDays[Math.max(0, oldIdx)] ?? newDays[0];
      newStart = new Date(targetDay);
      newStart.setHours(f.start.getHours(), f.start.getMinutes(), f.start.getSeconds(), 0);
    }
    const slotMs = (newState.options.slotDuration ?? 1800) * 1000;
    const cell: TimeSlot = { start: newStart, end: new Date(newStart.getTime() + slotMs) };
    this.commitFocusMove(cell, state.focusedResourceId, false);
  }

  /**
   * Apply the focus move to state and DOM. `extend` grows the selection
   * range; otherwise selection is cleared. Live-region announces the new
   * focused cell or selection range.
   */
  private commitFocusMove(cell: TimeSlot, resourceId: string | null, extend: boolean): void {
    const state = this.stateManager.getState();
    const slotDuration = state.options.slotDuration ?? 1800;
    if (extend) {
      this.stateManager.extendSelection(cell, resourceId);
      this.stateManager.setFocusedCell(cell, resourceId, false);
      const newState = this.stateManager.getState();
      this.liveAnnouncer.announce(formatSelectionAnnouncement(newState, slotDuration, state.options.timeFormat));
    } else {
      this.stateManager.setFocusedCell(cell, resourceId, true);
      const resourceTitle = this.getResourceTitle(resourceId);
      this.liveAnnouncer.announce(formatCellAnnouncement(cell, state.options.timeFormat, resourceTitle));
    }
    this.scrollAndFocusCell(cell, resourceId);
  }

  private cellIsWithinView(start: Date, state: SchedulerState): boolean {
    switch (state.view) {
      case 'day': {
        const dayStart = this.parseTimeOnDay(state.date, state.options.slotMinTime);
        const dayEnd = this.parseTimeOnDay(state.date, state.options.slotMaxTime);
        return start.getTime() >= dayStart.getTime() && start.getTime() < dayEnd.getTime();
      }
      case 'week':
      case 'timeline': {
        const days = dateService.getWeekDays(state.date, state.options.firstDayOfWeek);
        const viewStart = this.parseTimeOnDay(days[0], state.options.slotMinTime);
        const viewEnd = this.parseTimeOnDay(days[6], state.options.slotMaxTime);
        return start.getTime() >= viewStart.getTime() && start.getTime() < viewEnd.getTime();
      }
      default:
        return false;
    }
  }

  private parseTimeOnDay(day: Date, timeStr?: string): Date {
    const [h, m, s] = (timeStr ?? '00:00:00').split(':').map(Number);
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    d.setSeconds((h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0));
    return d;
  }

  private adjacentResource(currentId: string | null, direction: 1 | -1, state: SchedulerState): string | null {
    const flattened = resourceService.flatten(state.resources, state.collapsedGroups);
    const visible = flattened.filter((f) => f.visible && isResource(f.item));
    if (visible.length === 0) return null;
    if (!currentId) return visible[0].item.id;
    const idx = visible.findIndex((f) => f.item.id === currentId);
    if (idx < 0) return visible[0].item.id;
    const next = idx + direction;
    if (next < 0 || next >= visible.length) return null;
    return visible[next].item.id;
  }

  private getResourceTitle(id: string | null): string | null {
    if (!id) return null;
    for (const r of resourceService.getAllResources(this.stateManager.getState().resources)) {
      if (r.id === id) return r.title;
    }
    return null;
  }

  /**
   * Find the cell DOM element for a (slot, resource) pair and call .focus()
   * on it. scrollIntoView with block:nearest provides parity with mouse
   * drag-near-edge auto-pan (PRD D6).
   */
  private scrollAndFocusCell(cell: TimeSlot, resourceId: string | null): void {
    const startIso = cell.start.toISOString();
    const root = this.shadowRoot;
    if (!root) return;
    const sel = resourceId
      ? `.scheduler-timeline-slot[data-resource-id="${this.cssEscape(resourceId)}"][data-start="${startIso}"]`
      : `.scheduler-time-slot[data-start="${startIso}"]`;
    const el = root.querySelector(sel) as HTMLElement | null;
    if (!el) return;
    el.focus({ preventScroll: true });
    // jsdom doesn't implement scrollIntoView — guard so unit tests don't crash.
    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  /** Re-focus whatever cell the keyboard model currently considers focused. */
  private focusFocusedCell(): void {
    const state = this.stateManager.getState();
    if (state.focusedCell) {
      this.scrollAndFocusCell(state.focusedCell, state.focusedResourceId);
    }
  }

  private cssEscape(value: string): string {
    // Lightweight CSS.escape polyfill — sufficient for resource ids that are
    // ULID/UUIDs or simple strings. Falls back to the native API where it exists.
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
    return value.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);
  }

  /**
   * Emit `event-create` covering the active selection range, or a single
   * cell when no selection is active. Per PRD scheduler-controlled-selection,
   * this is a *request* — no internal state mutation, no auto-clear, no
   * auto-focus. The consumer constructs the SchedulerEvent and decides
   * whether/when to clear the selection.
   */
  private createEventFromCellOrSelection(originalEvent: Event): void {
    const state = this.stateManager.getState();
    const range = selectionRange(state);
    let start: Date;
    let end: Date;
    let resourceId: string | undefined;
    if (range) {
      start = range.start;
      end = range.end;
      resourceId = state.selectionResourceId ?? undefined;
    } else if (state.focusedCell) {
      start = state.focusedCell.start;
      end = state.focusedCell.end;
      resourceId = state.focusedResourceId ?? undefined;
    } else {
      return;
    }
    this.eventEmitter.emitEventCreate(
      { start, end },
      state.view,
      originalEvent,
      resourceId,
    );
    this.liveAnnouncer.announce(
      `Selection committed: ${dateService.formatTime(start, state.options.timeFormat)}–${dateService.formatTime(end, state.options.timeFormat)}.`,
    );
  }

  /**
   * Active keyboard-driven event move. Captures the original time range and
   * (timeline) resource so Escape can revert; the working copy is mutated in
   * place by arrow keys and committed or rolled back on Enter / Escape.
   */
  private keyboardMove: {
    eventId: string;
    originalStart: Date;
    originalEnd: Date;
    workingStart: Date;
    workingEnd: Date;
    workingResourceId: string | null;
  } | null = null;

  /**
   * Enter keyboard event-move mode. Captures the working copy and a snapshot
   * of the resource (timeline). Visual feedback is provided by routing the
   * working start/end through the existing previewEvent state — the same
   * channel used for mouse drag — so the event renders at the projected
   * destination as the user nudges.
   */
  private enterEventMoveMode(event: SchedulerEvent): void {
    const resourceId = event.resourceId ?? null;
    this.keyboardMove = {
      eventId: event.id,
      originalStart: new Date(event.start),
      originalEnd: new Date(event.end),
      workingStart: new Date(event.start),
      workingEnd: new Date(event.end),
      workingResourceId: resourceId,
    };
    this.stateManager.setState({
      keyboardMoveEventId: event.id,
      previewEvent: {
        start: new Date(event.start),
        end: new Date(event.end),
        ...(resourceId ? { resourceId } : {}),
      },
    });
    const minutes = this.minutesPerSlot();
    this.liveAnnouncer.announce(
      `Move mode for ${event.title}. Arrow keys nudge by ${minutes} minutes; Shift with arrow keys resizes the end edge; Alt with Shift resizes the start edge; Enter commits, Escape cancels.`,
    );
    // setState above tore down and rebuilt the focused event element. Re-focus
    // the new node so subsequent arrow keystrokes still reach our keydown
    // listener (otherwise focus falls back to <body> and our listener is
    // bypassed).
    requestAnimationFrame(() => {
      const sel = `[data-event-id="${this.cssEscape(event.id)}"]`;
      const el = this.shadowRoot?.querySelector(sel) as HTMLElement | null;
      el?.focus({ preventScroll: true });
    });
  }

  /**
   * Move-mode keymap. Layered on the existing M-mode foundation:
   *   - bare Arrow keys nudge the event
   *   - Shift+Arrow resizes the end edge
   *   - Alt+Shift+Arrow resizes the start edge
   *   - on week view, Shift+ArrowLeft/Right pushes the end edge across the
   *     day boundary (PRD D5) — symmetric with Shift+ArrowDown for time.
   *   - Enter commits, Escape reverts.
   */
  private handleKeyboardMove(e: KeyboardEvent): void {
    if (!this.keyboardMove) return;
    if (e.key === 'Escape') { e.preventDefault(); this.cancelEventMoveMode(); return; }
    if (e.key === 'Enter')  { e.preventDefault(); this.commitEventMoveMode();  return; }

    const view = this.stateManager.getState().view;
    const timelineLayout = view === 'timeline';
    const slotMs = this.minutesPerSlot() * 60 * 1000;
    const dayMs = 24 * 60 * 60 * 1000;
    const shift = e.shiftKey;
    const alt = e.altKey;

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        if (timelineLayout) {
          if (!shift && !alt) this.nudgeKeyboardMoveResource(-1);
        } else if (shift && alt) {
          this.resizeKeyboardMoveEdge('start', -slotMs);
        } else if (shift) {
          this.resizeKeyboardMoveEdge('end', -slotMs);
        } else {
          this.nudgeKeyboardMove(-slotMs);
        }
        return;
      case 'ArrowDown':
        e.preventDefault();
        if (timelineLayout) {
          if (!shift && !alt) this.nudgeKeyboardMoveResource(+1);
        } else if (shift && alt) {
          this.resizeKeyboardMoveEdge('start', +slotMs);
        } else if (shift) {
          this.resizeKeyboardMoveEdge('end', +slotMs);
        } else {
          this.nudgeKeyboardMove(+slotMs);
        }
        return;
      case 'ArrowLeft':
        e.preventDefault();
        if (timelineLayout) {
          if (shift && alt) this.resizeKeyboardMoveEdge('start', -slotMs);
          else if (shift) this.resizeKeyboardMoveEdge('end', -slotMs);
          else this.nudgeKeyboardMove(-slotMs);
        } else if (view === 'week') {
          // Week view (D5): Shift+Arrow on the column axis resizes the end edge
          // across the day boundary by 24h. Alt+Shift moves the start edge.
          if (shift && alt) this.resizeKeyboardMoveEdge('start', -dayMs);
          else if (shift) this.resizeKeyboardMoveEdge('end', -dayMs);
          else this.nudgeKeyboardMove(-dayMs);
        }
        return;
      case 'ArrowRight':
        e.preventDefault();
        if (timelineLayout) {
          if (shift && alt) this.resizeKeyboardMoveEdge('start', +slotMs);
          else if (shift) this.resizeKeyboardMoveEdge('end', +slotMs);
          else this.nudgeKeyboardMove(+slotMs);
        } else if (view === 'week') {
          if (shift && alt) this.resizeKeyboardMoveEdge('start', +dayMs);
          else if (shift) this.resizeKeyboardMoveEdge('end', +dayMs);
          else this.nudgeKeyboardMove(+dayMs);
        }
        return;
    }
  }

  private minutesPerSlot(): number {
    const seconds = this.stateManager.getState().options.slotDuration ?? 1800;
    return Math.max(1, Math.round(seconds / 60));
  }

  /** Shift the working event by `deltaMs` along the time axis (preserves duration). */
  private nudgeKeyboardMove(deltaMs: number): void {
    if (!this.keyboardMove) return;
    const newStart = new Date(this.keyboardMove.workingStart.getTime() + deltaMs);
    const newEnd = new Date(this.keyboardMove.workingEnd.getTime() + deltaMs);
    this.keyboardMove.workingStart = newStart;
    this.keyboardMove.workingEnd = newEnd;
    this.applyKeyboardMovePreview();
    this.liveAnnouncer.announce(formatMoveAnnouncement(newStart, newEnd, this.stateManager.getState().options.timeFormat));
  }

  /** Walk to the next/previous resource (timeline only). Updates the preview's resourceId. */
  private nudgeKeyboardMoveResource(direction: 1 | -1): void {
    if (!this.keyboardMove) return;
    const next = this.adjacentResource(this.keyboardMove.workingResourceId, direction, this.stateManager.getState());
    if (!next) return;
    this.keyboardMove.workingResourceId = next;
    this.applyKeyboardMovePreview();
    const title = this.getResourceTitle(next) ?? next;
    this.liveAnnouncer.announce(`Moved to resource ${title}.`);
  }

  /**
   * Resize one edge of the working event. Clamps to a minimum duration of
   * one slot to keep the event valid, and refuses to invert (start ≤ end).
   */
  private resizeKeyboardMoveEdge(edge: 'start' | 'end', deltaMs: number): void {
    if (!this.keyboardMove) return;
    const minDurationMs = this.minutesPerSlot() * 60 * 1000;
    let newStart = this.keyboardMove.workingStart;
    let newEnd = this.keyboardMove.workingEnd;
    if (edge === 'end') {
      newEnd = new Date(newEnd.getTime() + deltaMs);
      if (newEnd.getTime() - newStart.getTime() < minDurationMs) return;
    } else {
      newStart = new Date(newStart.getTime() + deltaMs);
      if (newEnd.getTime() - newStart.getTime() < minDurationMs) return;
    }
    this.keyboardMove.workingStart = newStart;
    this.keyboardMove.workingEnd = newEnd;
    this.applyKeyboardMovePreview();
    this.liveAnnouncer.announce(formatResizeAnnouncement(newStart, newEnd, edge, this.stateManager.getState().options.timeFormat));
  }

  /** Mirror keyboardMove.working* into state.previewEvent so views render the destination,
   *  then scroll the destination into view so the sighted-keyboard user can see it (PRD D6). */
  private applyKeyboardMovePreview(): void {
    if (!this.keyboardMove) return;
    const { eventId, workingStart, workingEnd, workingResourceId } = this.keyboardMove;
    this.stateManager.setState({
      previewEvent: {
        start: workingStart,
        end: workingEnd,
        ...(workingResourceId ? { resourceId: workingResourceId } : {}),
      },
    });
    // Each move-mode update tears down + rebuilds event elements (renderEvents
    // is unconditional in week/day/timeline). Re-focus the event so subsequent
    // arrow keystrokes still reach our keydown listener instead of falling
    // through to <body>. Also scroll the preview cell into view.
    requestAnimationFrame(() => {
      const root = this.shadowRoot;
      if (!root) return;
      const eventEl = root.querySelector(`[data-event-id="${this.cssEscape(eventId)}"]`) as HTMLElement | null;
      eventEl?.focus({ preventScroll: true });
      const startIso = workingStart.toISOString();
      const sel = workingResourceId
        ? `.scheduler-timeline-slot[data-resource-id="${this.cssEscape(workingResourceId)}"][data-start="${startIso}"]`
        : `.scheduler-time-slot[data-start="${startIso}"]`;
      const cellEl = root.querySelector(sel) as HTMLElement | null;
      if (cellEl && typeof cellEl.scrollIntoView === 'function') {
        cellEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    });
  }

  private commitEventMoveMode(): void {
    if (!this.keyboardMove) return;
    const original = this.getEventById(this.keyboardMove.eventId);
    if (original) {
      const updated: SchedulerEvent = {
        ...original,
        start: this.keyboardMove.workingStart,
        end: this.keyboardMove.workingEnd,
        ...(this.keyboardMove.workingResourceId
          ? { resourceId: this.keyboardMove.workingResourceId }
          : {}),
      };
      this.stateManager.updateEvent(updated);
      this.eventEmitter.emitEventUpdate(updated, original, new CustomEvent('keyboard-move'));
      this.liveAnnouncer.announce('Move committed.');
    }
    this.keyboardMove = null;
    this.stateManager.setState({ keyboardMoveEventId: null, previewEvent: null });
    // Re-focus the moved event after re-render.
    requestAnimationFrame(() => {
      const sel = `[data-event-id="${this.cssEscape(original?.id ?? '')}"]`;
      const el = this.shadowRoot?.querySelector(sel) as HTMLElement | null;
      el?.focus({ preventScroll: false });
    });
  }

  private cancelEventMoveMode(): void {
    const id = this.keyboardMove?.eventId ?? null;
    this.keyboardMove = null;
    this.stateManager.setState({ keyboardMoveEventId: null, previewEvent: null });
    this.liveAnnouncer.announce('Move cancelled.');
    if (id) {
      requestAnimationFrame(() => {
        const sel = `[data-event-id="${this.cssEscape(id)}"]`;
        const el = this.shadowRoot?.querySelector(sel) as HTMLElement | null;
        el?.focus({ preventScroll: false });
      });
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
    const elements = this.shadowRoot!.elementsFromPoint(clientX, clientY);
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
