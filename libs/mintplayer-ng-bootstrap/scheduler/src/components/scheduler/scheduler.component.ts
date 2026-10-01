import {
  Component,
  ElementRef,
  viewChild,
  AfterViewInit,
  ChangeDetectionStrategy,
  booleanAttribute,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
  output,
  OutputEmitterRef,
  model,
  computed,
  effect,
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
} from '@mintplayer/web-components/scheduler-core';

// Import the web component to ensure it gets registered
import '@mintplayer/web-components/scheduler';
import { BsForwardAriaDirective } from '@mintplayer/ng-bootstrap/a11y';

/**
 * Interface for the mp-scheduler web component element
 */
interface MpSchedulerElement extends HTMLElement {
  view: ViewType;
  date: Date;
  events: SchedulerEvent[];
  resources: (Resource | ResourceGroup)[];
  options: Partial<SchedulerOptions>;
  selectedEvent: SchedulerEvent | null;
  selectedRange: { start: Date; end: Date } | null;
  next(): void;
  prev(): void;
  today(): void;
  gotoDate(date: Date): void;
  changeView(view: ViewType): void;
  clearSelection(): void;
  addEvent(event: SchedulerEvent): void;
  updateEvent(event: SchedulerEvent): void;
  removeEvent(eventId: string): void;
  getEventById(eventId: string): SchedulerEvent | null;
  refetchEvents(): void;
}

/**
 * Event-selected event detail. Fires on mouse click and on keyboard Tab
 * landing on an event (PRD scheduler-keyboard-grid-nav D3 — renamed from
 * `event-click` because keyboard now triggers the same notification).
 */
export interface SchedulerEventSelectedEvent {
  event: SchedulerEvent;
  originalEvent?: Event;
}

/**
 * Event create *request* event. Per PRD scheduler-controlled-selection, the
 * `mp-scheduler` web-component no longer constructs an event itself on drag-end
 * or `Enter` — it emits the selected range and the consumer decides whether
 * to push a `SchedulerEvent` into its `[events]` input.
 */
export interface SchedulerEventCreateEvent {
  /** The selected time range. */
  range: { start: Date; end: Date };
  /** Resource the request targets (timeline view only). */
  resourceId?: string;
  /** View that produced the request. */
  view: ViewType;
  originalEvent?: Event;
}

/**
 * Selection-change event. Fires on every transition — including the
 * transition to an empty selection. `selectedEvent` and `range` are
 * independent dimensions of the selection state.
 */
export interface SchedulerSelectionChangeEvent {
  selectedEvent: SchedulerEvent | null;
  range: { start: Date; end: Date } | null;
  view: ViewType;
  resourceId?: string;
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
 * Resource/group creation *request*. Like `eventCreate`, the scheduler never
 * edits its own `[resources]` — the consumer decides the id, title and where
 * in the tree the new item goes. `parentId` names the group to insert into and
 * is absent for a root-level item.
 */
export interface SchedulerResourceCreateEvent {
  parentId?: string;
  view: ViewType;
  originalEvent?: Event;
}

/**
 * Resource/group mutation request. `changes` carries only the fields the
 * scheduler is asking to change, so a handler can apply them without diffing.
 */
export interface SchedulerResourceUpdateEvent {
  resource: Resource | ResourceGroup;
  changes: Partial<Resource & ResourceGroup>;
  originalEvent?: Event;
}

/**
 * Resource/group deletion request.
 */
export interface SchedulerResourceDeleteEvent {
  resource: Resource | ResourceGroup;
  originalEvent?: Event;
}

/**
 * Angular wrapper for the mp-scheduler web component using signals
 */
@Component({
  selector: 'bs-scheduler',
  templateUrl: './scheduler.component.html',
  imports: [BsForwardAriaDirective],
  styleUrls: ['./scheduler.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BsSchedulerComponent implements AfterViewInit {
  private readonly injector = inject(Injector);

  private readonly schedulerRef = viewChild.required<ElementRef<MpSchedulerElement>>('scheduler');

  // Input signals
  readonly events = input<SchedulerEvent[]>([]);
  readonly resources = input<(Resource | ResourceGroup)[]>([]);
  readonly options = input<Partial<SchedulerOptions>>({});

  /**
   * Coarse read-only switch — the one-line way to make the whole scheduler
   * look-but-don't-touch. It maps onto the WC's `readonly` attribute rather
   * than a property so plain-HTML and SSR consumers get the same knob;
   * `[options].permissions` still refines individual capabilities beneath it.
   * Aliased because `readonly` cannot name a class member here.
   */
  readonly isReadonly = input(false, { alias: 'readonly', transform: booleanAttribute });
  protected readonly readonlyAttr = computed(() => (this.isReadonly() ? '' : null));

  /**
   * The WC's built-in event editor (double-click / right-click / F2 on an
   * event), ON by default. Set false when the app ships its own editor —
   * `(eventDblClick)` keeps firing either way. Rendered as the `event-editor`
   * attribute, whose literal "false" is the off switch, so the binding can be
   * unconditional.
   */
  readonly eventEditor = input(true, { transform: booleanAttribute });
  protected readonly eventEditorAttr = computed(() => (this.eventEditor() ? 'true' : 'false'));

  // Two-way binding model signals. `view` and `date` are models (not inputs)
  // because the web component changes both from within — prev/next/today
  // navigation and the view switcher — and delivers the new values via its
  // `view-change` event; a one-way input would go stale after any internal
  // navigation.
  readonly view = model<ViewType>('week');
  readonly date = model<Date>(new Date());
  readonly selectedEvent = model<SchedulerEvent | null>(null);
  readonly selectedRange = model<{ start: Date; end: Date } | null>(null);

  // Output signals (events). NOTE (breaking, PRD scheduler-resize-glyphs D8):
  // the explicit `viewChange` output<ViewChangeEvent> is gone — `view` and
  // `date` are model() signals now, whose implicit `viewChange`/`dateChange`
  // outputs emit the new ViewType / Date on every internal navigation.
  readonly eventSelected = output<SchedulerEventSelectedEvent>();
  readonly eventDblClick = output<SchedulerEventSelectedEvent>();
  readonly eventCreate = output<SchedulerEventCreateEvent>();
  readonly eventUpdate = output<SchedulerEventUpdateEvent>();
  readonly eventDelete = output<SchedulerEventDeleteEvent>();
  readonly dateClick = output<DateClickEvent>();
  readonly selectionChange = output<SchedulerSelectionChangeEvent>();
  readonly resourceCreate = output<SchedulerResourceCreateEvent>();
  readonly groupCreate = output<SchedulerResourceCreateEvent>();
  readonly resourceUpdate = output<SchedulerResourceUpdateEvent>();
  readonly resourceDelete = output<SchedulerResourceDeleteEvent>();

  ngAfterViewInit(): void {
    const el = this.schedulerRef().nativeElement;
    // One effect per property, so a change to one input re-assigns only that
    // property on the element.
    runInInjectionContext(this.injector, () => {
      effect(() => { this.writeNavigation(() => (el.view = this.view())); });
      effect(() => { this.writeNavigation(() => (el.date = this.date())); });
      effect(() => { el.events = this.events(); });
      effect(() => { el.resources = this.resources(); });
      effect(() => { el.options = this.options(); });
      effect(() => { el.selectedEvent = this.selectedEvent(); });
    });
  }

  /**
   * True while the wrapper itself assigns `view` / `date`. The element answers
   * such a write with a synchronous `view-change` carrying its state at that
   * moment, i.e. the OTHER value still old; adopting it would overwrite a date
   * the consumer set in the same tick. Only the element's own navigation is
   * written back.
   */
  private writingNavigation = false;

  private writeNavigation(write: () => void): void {
    this.writingNavigation = true;
    try {
      write();
    } finally {
      this.writingNavigation = false;
    }
  }

  // ----- WC event bridges (bound in the template) --------------------------

  protected onEventSelected(e: Event): void {
    const detail = (e as CustomEvent<SchedulerEventSelectedEvent>).detail;
    this.eventSelected.emit(detail);
    this.selectedEvent.set(detail.event);
  }

  protected onViewChange(e: Event): void {
    if (this.writingNavigation) return;
    // The WC fires view-change for BOTH view switches and internal date
    // navigation (prev/next/today/gotoDate) — write both back so the
    // consumer's two-way bindings track reality. The model .set() calls
    // emit the implicit viewChange/dateChange outputs.
    const detail = (e as CustomEvent<{ view: ViewType; date: Date }>).detail;
    this.view.set(detail.view);
    this.date.set(detail.date);
  }

  protected onSelectionChange(e: Event): void {
    const detail = (e as CustomEvent<SchedulerSelectionChangeEvent>).detail;
    this.selectionChange.emit(detail);
    this.selectedEvent.set(detail.selectedEvent);
    this.selectedRange.set(detail.range);
  }

  /** Re-emits a WC event's detail on the matching output, unchanged. */
  protected forward<T>(target: OutputEmitterRef<T>, e: Event): void {
    target.emit((e as CustomEvent<T>).detail);
  }


  // Public API methods (delegate to web component)

  /**
   * Navigate to next period
   */
  next(): void {
    this.schedulerRef().nativeElement.next();
  }

  /**
   * Navigate to previous period
   */
  prev(): void {
    this.schedulerRef().nativeElement.prev();
  }

  /**
   * Navigate to today
   */
  today(): void {
    this.schedulerRef().nativeElement.today();
  }

  /**
   * Navigate to a specific date
   */
  gotoDate(date: Date): void {
    this.schedulerRef().nativeElement.gotoDate(date);
  }

  /**
   * Change the current view
   */
  changeView(view: ViewType): void {
    this.schedulerRef().nativeElement.changeView(view);
  }

  /**
   * Clear the time-range selection and the focused-cell selection. Call this
   * from your `(eventCreate)` handler if you want the post-create selection
   * cleared — the scheduler no longer auto-clears (PRD: scheduler-controlled-selection).
   */
  clearSelection(): void {
    this.schedulerRef().nativeElement.clearSelection();
  }

  /**
   * Add an event
   */
  addEvent(event: SchedulerEvent): void {
    this.schedulerRef().nativeElement.addEvent(event);
  }

  /**
   * Update an event
   */
  updateEvent(event: SchedulerEvent): void {
    this.schedulerRef().nativeElement.updateEvent(event);
  }

  /**
   * Remove an event
   */
  removeEvent(eventId: string): void {
    this.schedulerRef().nativeElement.removeEvent(eventId);
  }

  /**
   * Get an event by ID
   */
  getEventById(eventId: string): SchedulerEvent | null {
    return this.schedulerRef().nativeElement.getEventById(eventId);
  }

  /**
   * Refetch/refresh events
   */
  refetchEvents(): void {
    this.schedulerRef().nativeElement.refetchEvents();
  }
}
