import {
  ViewType,
  SchedulerEvent,
  Resource,
  ResourceGroup,
  SchedulerOptions,
  DEFAULT_OPTIONS,
  DragOperationType,
  PreviewEvent,
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

/**
 * MpScheduler Web Component
 *
 * A fully-featured scheduler/calendar component
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
  private contentContainer: HTMLElement | null = null;

  // Track previous state for change detection
  private previousView: ViewType | null = null;
  private previousDate: Date | null = null;
  private previousSelectedEventId: string | null = null;

  // Event handlers bound to this
  private boundHandleMouseDown: (e: MouseEvent) => void;
  private boundHandleMouseMove: (e: MouseEvent) => void;
  private boundHandleMouseUp: (e: MouseEvent) => void;
  private boundHandleClick: (e: MouseEvent) => void;
  private boundHandleDblClick: (e: MouseEvent) => void;
  private boundHandleKeyDown: (e: KeyboardEvent) => void;

  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'open' });
    this.stateManager = new SchedulerStateManager();

    // Bind event handlers
    this.boundHandleMouseDown = this.handleMouseDown.bind(this);
    this.boundHandleMouseMove = this.handleMouseMove.bind(this);
    this.boundHandleMouseUp = this.handleMouseUp.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);
    this.boundHandleDblClick = this.handleDblClick.bind(this);
    this.boundHandleKeyDown = this.handleKeyDown.bind(this);

    // Subscribe to state changes
    this.stateManager.subscribe((state) => this.onStateChange(state));
  }

  connectedCallback(): void {
    this.render();
    this.attachEventListeners();
  }

  disconnectedCallback(): void {
    this.detachEventListeners();
    this.currentView?.destroy();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
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
            this.stateManager.setOptions({ firstDayOfWeek: day as 0 | 1 | 2 | 3 | 4 | 5 | 6 });
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

  // Public API

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
    // Trigger re-render
    this.currentView?.update(this.stateManager.getState());
  }

  // Private methods

  private render(): void {
    // Add styles
    const style = document.createElement('style');
    style.textContent = schedulerStyles;
    this.shadow.appendChild(style);

    // Create container
    const container = document.createElement('div');
    container.className = 'scheduler-container';

    // Header
    const header = this.createHeader();
    container.appendChild(header);

    // Content
    this.contentContainer = document.createElement('div');
    this.contentContainer.className = 'scheduler-content';
    container.appendChild(this.contentContainer);

    this.shadow.appendChild(container);

    // Initial view render
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
        titleText = `${dateService.formatDate(weekStart, options.locale, { month: 'short', day: 'numeric' })} - ${dateService.formatDate(weekEnd, options.locale, { month: 'short', day: 'numeric', year: 'numeric' })}`;
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

    // Destroy previous view
    this.currentView?.destroy();

    const state = this.stateManager.getState();

    // Create new view
    switch (state.view) {
      case 'year':
        this.currentView = new YearView(this.contentContainer, state);
        break;
      case 'month':
        this.currentView = new MonthView(this.contentContainer, state);
        break;
      case 'week':
        this.currentView = new WeekView(this.contentContainer, state);
        break;
      case 'day':
        this.currentView = new DayView(this.contentContainer, state);
        break;
      case 'timeline':
        this.currentView = new TimelineView(this.contentContainer, state);
        break;
    }

    this.currentView?.render();
  }

  private onStateChange(state: SchedulerState): void {
    // Detect view/date changes and dispatch events
    const viewChanged = this.previousView !== null && this.previousView !== state.view;
    const dateChanged = this.previousDate !== null && this.previousDate.getTime() !== state.date.getTime();
    const selectedEventId = state.selectedEvent?.id ?? null;
    const selectionChanged = this.previousSelectedEventId !== null && this.previousSelectedEventId !== selectedEventId;

    // Dispatch view-change event if view or date changed (but not on initial render)
    if (viewChanged || dateChanged) {
      this.dispatchEvent(
        new CustomEvent('view-change', {
          detail: { view: state.view, date: state.date },
          bubbles: true,
        })
      );
    }

    // Dispatch selection-change event if selected event changed (but not on initial render)
    if (selectionChanged) {
      this.dispatchEvent(
        new CustomEvent('selection-change', {
          detail: { selectedEvent: state.selectedEvent },
          bubbles: true,
        })
      );
    }

    // Update previous state tracking
    this.previousView = state.view;
    this.previousDate = new Date(state.date);
    this.previousSelectedEventId = selectedEventId;

    // Update title
    this.updateTitle();

    // Update view switcher active state
    const buttons = this.shadow.querySelectorAll('.scheduler-view-switcher button');
    buttons.forEach((btn) => {
      const btnEl = btn as HTMLButtonElement;
      btnEl.classList.toggle('active', btnEl.dataset['view'] === state.view);
    });

    // Update or re-render view
    if (this.currentView) {
      // Check if view type changed
      const viewTypeChanged = this.viewTypeChanged(state.view);
      if (viewTypeChanged) {
        this.renderView();
      } else {
        this.currentView.update(state);
      }
    }
  }

  private viewTypeChanged(newView: ViewType): boolean {
    if (!this.currentView) return true;

    const viewClass = this.currentView.constructor.name.toLowerCase();
    return !viewClass.includes(newView);
  }

  private attachEventListeners(): void {
    const root = this.shadow as unknown as HTMLElement;
    root.addEventListener('mousedown', this.boundHandleMouseDown as EventListener);
    document.addEventListener('mousemove', this.boundHandleMouseMove);
    document.addEventListener('mouseup', this.boundHandleMouseUp);
    root.addEventListener('click', this.boundHandleClick as EventListener);
    root.addEventListener('dblclick', this.boundHandleDblClick as EventListener);
    this.addEventListener('keydown', this.boundHandleKeyDown);
  }

  private detachEventListeners(): void {
    const root = this.shadow as unknown as HTMLElement;
    root.removeEventListener('mousedown', this.boundHandleMouseDown as EventListener);
    document.removeEventListener('mousemove', this.boundHandleMouseMove);
    document.removeEventListener('mouseup', this.boundHandleMouseUp);
    root.removeEventListener('click', this.boundHandleClick as EventListener);
    root.removeEventListener('dblclick', this.boundHandleDblClick as EventListener);
    this.removeEventListener('keydown', this.boundHandleKeyDown);
  }

  private handleMouseDown(e: MouseEvent): void {
    const state = this.stateManager.getState();
    if (!state.options.editable) return;

    const target = e.target as HTMLElement;

    // Check for resize handle
    const resizeHandle = target.closest('.resize-handle') as HTMLElement;
    if (resizeHandle) {
      const eventEl = resizeHandle.closest('.scheduler-event') as HTMLElement;
      const eventId = eventEl?.dataset['eventId'];
      const event = eventId ? this.getEventById(eventId) : null;

      if (event) {
        const handleType = resizeHandle.dataset['handle'] as 'start' | 'end';
        this.startDrag('resize-' + handleType as DragOperationType, event, e);
        e.preventDefault();
        return;
      }
    }

    // Check for event drag
    const eventEl = target.closest('.scheduler-event:not(.preview)') as HTMLElement;
    if (eventEl && !eventEl.classList.contains('preview')) {
      const eventId = eventEl.dataset['eventId'];
      const event = eventId ? this.getEventById(eventId) : null;

      if (event && event.draggable !== false) {
        this.startDrag('move', event, e);
        e.preventDefault();
        return;
      }
    }

    // Check for slot click (create event)
    const slotEl = target.closest('.scheduler-time-slot, .scheduler-timeline-slot') as HTMLElement;
    if (slotEl && state.options.selectable) {
      this.startDrag('create', null, e, slotEl);
      e.preventDefault();
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const state = this.stateManager.getState();
    if (!state.dragState) return;

    const slot = this.getSlotAtPosition(e.clientX, e.clientY);
    if (!slot) return;

    const preview = this.calculatePreview(state.dragState.type, state.dragState, slot);
    if (preview) {
      this.stateManager.updateDrag(slot, preview);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    const state = this.stateManager.getState();
    if (!state.dragState) return;

    const { type, event, preview } = state.dragState;

    // Finalize the drag operation
    if (preview) {
      if (type === 'create') {
        // Create new event
        const newEvent: SchedulerEvent = {
          id: generateEventId(),
          title: 'New Event',
          start: preview.start,
          end: preview.end,
          color: '#3788d8',
        };

        this.stateManager.addEvent(newEvent);
        this.dispatchEvent(
          new CustomEvent('event-create', {
            detail: { event: newEvent, originalEvent: e },
            bubbles: true,
          })
        );
      } else if (type === 'move' && event) {
        // Move event
        const oldEvent = { ...event };
        const updatedEvent: SchedulerEvent = {
          ...event,
          start: preview.start,
          end: preview.end,
        };

        this.stateManager.updateEvent(updatedEvent);
        this.dispatchEvent(
          new CustomEvent('event-update', {
            detail: { event: updatedEvent, oldEvent, originalEvent: e },
            bubbles: true,
          })
        );
      } else if ((type === 'resize-start' || type === 'resize-end') && event) {
        // Resize event
        const oldEvent = { ...event };
        const updatedEvent: SchedulerEvent = {
          ...event,
          start: preview.start,
          end: preview.end,
        };

        this.stateManager.updateEvent(updatedEvent);
        this.dispatchEvent(
          new CustomEvent('event-update', {
            detail: { event: updatedEvent, oldEvent, originalEvent: e },
            bubbles: true,
          })
        );
      }
    }

    this.stateManager.endDrag();
  }

  private handleClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    // Group toggle
    const toggle = target.closest('.expand-toggle') as HTMLElement;
    if (toggle) {
      const groupId = toggle.dataset['groupId'];
      if (groupId) {
        this.stateManager.toggleGroupCollapse(groupId);
        this.renderView();
        return;
      }
    }

    // Event click
    const eventEl = target.closest('.scheduler-event') as HTMLElement;
    if (eventEl) {
      const eventId = eventEl.dataset['eventId'];
      const event = eventId ? this.getEventById(eventId) : null;

      if (event) {
        this.stateManager.setSelectedEvent(event);
        this.dispatchEvent(
          new CustomEvent('event-click', {
            detail: { event, originalEvent: e },
            bubbles: true,
          })
        );
        return;
      }
    }

    // Date click
    const dayEl = target.closest('[data-date]') as HTMLElement;
    if (dayEl) {
      const dateStr = dayEl.dataset['date'];
      if (dateStr) {
        this.dispatchEvent(
          new CustomEvent('date-click', {
            detail: { date: new Date(dateStr), originalEvent: e },
            bubbles: true,
          })
        );
      }
    }

    // Month click in year view
    const monthHeader = target.closest('.scheduler-year-month-header') as HTMLElement;
    if (monthHeader) {
      const monthStr = monthHeader.dataset['month'];
      if (monthStr) {
        this.stateManager.setDate(new Date(monthStr));
        this.stateManager.setView('month');
      }
    }

    // More link click
    const moreLink = target.closest('.scheduler-more-link') as HTMLElement;
    if (moreLink) {
      const dateStr = moreLink.dataset['date'];
      if (dateStr) {
        this.stateManager.setDate(new Date(dateStr));
        this.stateManager.setView('day');
      }
    }
  }

  private handleDblClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;

    const eventEl = target.closest('.scheduler-event') as HTMLElement;
    if (eventEl) {
      const eventId = eventEl.dataset['eventId'];
      const event = eventId ? this.getEventById(eventId) : null;

      if (event) {
        this.dispatchEvent(
          new CustomEvent('event-dblclick', {
            detail: { event, originalEvent: e },
            bubbles: true,
          })
        );
      }
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
          this.dispatchEvent(
            new CustomEvent('event-delete', {
              detail: { event: state.selectedEvent },
              bubbles: true,
            })
          );
        }
        break;
      case 'Escape':
        if (state.dragState) {
          this.stateManager.endDrag();
        }
        break;
    }
  }

  private startDrag(
    type: DragOperationType,
    event: SchedulerEvent | null,
    mouseEvent: MouseEvent,
    slotEl?: HTMLElement
  ): void {
    const slot = slotEl
      ? this.getSlotFromElement(slotEl)
      : this.getSlotAtPosition(mouseEvent.clientX, mouseEvent.clientY);

    if (!slot) return;

    let preview: PreviewEvent;

    if (type === 'create') {
      preview = {
        start: slot.start,
        end: slot.end,
      };
    } else if (event) {
      preview = {
        start: event.start,
        end: event.end,
      };
    } else {
      return;
    }

    this.stateManager.startDrag({
      type,
      event,
      startSlot: slot,
      currentSlot: slot,
      preview,
      originalEvent: event ? { ...event } : undefined,
      meta: type.startsWith('resize-')
        ? { resizeHandle: type.replace('resize-', '') as 'start' | 'end' }
        : undefined,
    });
  }

  private calculatePreview(
    type: DragOperationType,
    dragState: NonNullable<SchedulerState['dragState']>,
    currentSlot: TimeSlot
  ): PreviewEvent | null {
    const { startSlot, event, originalEvent } = dragState;

    if (type === 'create') {
      // Extend selection from start slot to current slot
      const start = new Date(Math.min(startSlot.start.getTime(), currentSlot.start.getTime()));
      const end = new Date(Math.max(startSlot.end.getTime(), currentSlot.end.getTime()));
      return { start, end };
    }

    if (type === 'move' && originalEvent) {
      // Calculate offset and apply to event
      const offsetMs = currentSlot.start.getTime() - startSlot.start.getTime();
      const duration = originalEvent.end.getTime() - originalEvent.start.getTime();
      const newStart = new Date(originalEvent.start.getTime() + offsetMs);
      const newEnd = new Date(newStart.getTime() + duration);
      return { start: newStart, end: newEnd };
    }

    if (type === 'resize-start' && originalEvent) {
      // Move start, keep end fixed
      const newStart = new Date(Math.min(currentSlot.start.getTime(), originalEvent.end.getTime() - 1800000));
      return { start: newStart, end: originalEvent.end };
    }

    if (type === 'resize-end' && originalEvent) {
      // Move end, keep start fixed
      const newEnd = new Date(Math.max(currentSlot.end.getTime(), originalEvent.start.getTime() + 1800000));
      return { start: originalEvent.start, end: newEnd };
    }

    return null;
  }

  private getSlotAtPosition(clientX: number, clientY: number): TimeSlot | null {
    const slotEl = this.shadow.elementsFromPoint(clientX, clientY)
      .find((el) => el.matches('.scheduler-time-slot, .scheduler-timeline-slot')) as HTMLElement | undefined;

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
