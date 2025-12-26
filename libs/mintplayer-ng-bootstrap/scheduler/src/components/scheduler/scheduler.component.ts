import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  ChangeDetectionStrategy,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  output,
  model,
  computed,
  effect,
  signal,
  Injector,
  inject,
  runInInjectionContext,
} from '@angular/core';

import {
  ViewType,
  SchedulerEvent,
  Resource,
  ResourceGroup,
  SchedulerOptions,
} from '@mintplayer/scheduler-core';

// Import the web component to ensure it gets registered
import '@mintplayer/scheduler-wc';

/**
 * Interface for the mp-scheduler web component element
 */
interface MpSchedulerElement extends HTMLElement {
  view: ViewType;
  date: Date;
  events: SchedulerEvent[];
  resources: (Resource | ResourceGroup)[];
  options: Partial<SchedulerOptions>;
  next(): void;
  prev(): void;
  today(): void;
  gotoDate(date: Date): void;
  changeView(view: ViewType): void;
  addEvent(event: SchedulerEvent): void;
  updateEvent(event: SchedulerEvent): void;
  removeEvent(eventId: string): void;
  getEventById(eventId: string): SchedulerEvent | null;
  refetchEvents(): void;
}

/**
 * Event click event detail
 */
export interface SchedulerEventClickEvent {
  event: SchedulerEvent;
  originalEvent?: Event;
}

/**
 * Event create event detail
 */
export interface SchedulerEventCreateEvent {
  event: SchedulerEvent;
  resource?: Resource;
  originalEvent?: Event;
}

/**
 * Event update event detail
 */
export interface SchedulerEventUpdateEvent {
  event: SchedulerEvent;
  oldEvent: SchedulerEvent;
  originalEvent?: Event;
}

/**
 * Event delete event detail
 */
export interface SchedulerEventDeleteEvent {
  event: SchedulerEvent;
  originalEvent?: Event;
}

/**
 * Date click event detail
 */
export interface DateClickEvent {
  date: Date;
  resource?: Resource;
  originalEvent?: Event;
}

/**
 * Date select event detail
 */
export interface DateSelectEvent {
  start: Date;
  end: Date;
  resource?: Resource;
  originalEvent?: Event;
}

/**
 * View change event detail
 */
export interface ViewChangeEvent {
  view: ViewType;
  date: Date;
}

/**
 * Angular wrapper for the mp-scheduler web component using signals
 */
@Component({
  selector: 'bs-scheduler',
  standalone: true,
  template: `<mp-scheduler #scheduler></mp-scheduler>`,
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
    mp-scheduler {
      display: block;
      height: 100%;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BsSchedulerComponent implements AfterViewInit, OnDestroy {
  private readonly injector = inject(Injector);

  @ViewChild('scheduler', { static: true })
  private schedulerRef!: ElementRef<MpSchedulerElement>;

  // Input signals
  readonly view = input<ViewType>('week');
  readonly date = input<Date>(new Date());
  readonly events = input<SchedulerEvent[]>([]);
  readonly resources = input<(Resource | ResourceGroup)[]>([]);
  readonly options = input<Partial<SchedulerOptions>>({});

  // Two-way binding model signals
  readonly selectedEvent = model<SchedulerEvent | null>(null);
  readonly selectedRange = model<{ start: Date; end: Date } | null>(null);

  // Output signals (events)
  readonly eventClick = output<SchedulerEventClickEvent>();
  readonly eventDblClick = output<SchedulerEventClickEvent>();
  readonly eventCreate = output<SchedulerEventCreateEvent>();
  readonly eventUpdate = output<SchedulerEventUpdateEvent>();
  readonly eventDelete = output<SchedulerEventDeleteEvent>();
  readonly dateClick = output<DateClickEvent>();
  readonly dateSelect = output<DateSelectEvent>();
  readonly viewChange = output<ViewChangeEvent>();

  // Computed signals
  readonly currentWeekStart = computed(() => {
    const d = new Date(this.date());
    const day = d.getDay();
    const diff = (day === 0 ? 6 : day - 1); // Adjust for Monday start
    d.setDate(d.getDate() - diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  readonly currentWeekEnd = computed(() => {
    const start = this.currentWeekStart();
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  });

  readonly visibleEvents = computed(() => {
    const start = this.currentWeekStart();
    const end = this.currentWeekEnd();
    return this.events().filter(
      (e) => e.start < end && e.end > start
    );
  });

  // Internal state
  private readonly initialized = signal(false);
  private eventListeners: Array<{ type: string; listener: EventListener }> = [];

  ngAfterViewInit(): void {
    runInInjectionContext(this.injector, () => {
      // Set up effects to sync inputs to web component
      effect(() => {
        const el = this.schedulerRef?.nativeElement;
        if (el) {
          el.view = this.view();
        }
      });

      effect(() => {
        const el = this.schedulerRef?.nativeElement;
        if (el) {
          el.date = this.date();
        }
      });

      effect(() => {
        const el = this.schedulerRef?.nativeElement;
        if (el) {
          el.events = this.events();
        }
      });

      effect(() => {
        const el = this.schedulerRef?.nativeElement;
        if (el) {
          el.resources = this.resources();
        }
      });

      effect(() => {
        const el = this.schedulerRef?.nativeElement;
        if (el) {
          el.options = this.options();
        }
      });
    });

    // Set up event listeners
    this.setupEventListeners();
    this.initialized.set(true);
  }

  ngOnDestroy(): void {
    this.removeEventListeners();
  }

  private setupEventListeners(): void {
    const el = this.schedulerRef?.nativeElement;
    if (!el) return;

    const addListener = (type: string, handler: (e: CustomEvent) => void) => {
      const listener = (e: Event) => handler(e as CustomEvent);
      el.addEventListener(type, listener);
      this.eventListeners.push({ type, listener });
    };

    addListener('event-click', (e) => {
      this.eventClick.emit(e.detail);
      this.selectedEvent.set(e.detail.event);
    });

    addListener('event-dblclick', (e) => {
      this.eventDblClick.emit(e.detail);
    });

    addListener('event-create', (e) => {
      this.eventCreate.emit(e.detail);
    });

    addListener('event-update', (e) => {
      this.eventUpdate.emit(e.detail);
    });

    addListener('event-delete', (e) => {
      this.eventDelete.emit(e.detail);
    });

    addListener('date-click', (e) => {
      this.dateClick.emit(e.detail);
    });

    addListener('date-select', (e) => {
      this.dateSelect.emit(e.detail);
      this.selectedRange.set({ start: e.detail.start, end: e.detail.end });
    });

    addListener('view-change', (e) => {
      this.viewChange.emit(e.detail);
    });
  }

  private removeEventListeners(): void {
    const el = this.schedulerRef?.nativeElement;
    if (!el) return;

    for (const { type, listener } of this.eventListeners) {
      el.removeEventListener(type, listener);
    }
    this.eventListeners = [];
  }

  // Public API methods (delegate to web component)

  /**
   * Navigate to next period
   */
  next(): void {
    this.schedulerRef?.nativeElement?.next();
  }

  /**
   * Navigate to previous period
   */
  prev(): void {
    this.schedulerRef?.nativeElement?.prev();
  }

  /**
   * Navigate to today
   */
  today(): void {
    this.schedulerRef?.nativeElement?.today();
  }

  /**
   * Navigate to a specific date
   */
  gotoDate(date: Date): void {
    this.schedulerRef?.nativeElement?.gotoDate(date);
  }

  /**
   * Change the current view
   */
  changeView(view: ViewType): void {
    this.schedulerRef?.nativeElement?.changeView(view);
  }

  /**
   * Add an event
   */
  addEvent(event: SchedulerEvent): void {
    this.schedulerRef?.nativeElement?.addEvent(event);
  }

  /**
   * Update an event
   */
  updateEvent(event: SchedulerEvent): void {
    this.schedulerRef?.nativeElement?.updateEvent(event);
  }

  /**
   * Remove an event
   */
  removeEvent(eventId: string): void {
    this.schedulerRef?.nativeElement?.removeEvent(eventId);
  }

  /**
   * Get an event by ID
   */
  getEventById(eventId: string): SchedulerEvent | null {
    return this.schedulerRef?.nativeElement?.getEventById(eventId) ?? null;
  }

  /**
   * Refetch/refresh events
   */
  refetchEvents(): void {
    this.schedulerRef?.nativeElement?.refetchEvents();
  }
}
