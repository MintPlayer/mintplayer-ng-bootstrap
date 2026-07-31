import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { LiveAnnouncerController } from '@mintplayer/web-components/a11y';
import {
  ViewType,
  SchedulerEvent,
  Resource,
  ResourceGroup,
  SchedulerOptions,
  SchedulerMessages,
  SchedulerCapability,
  SchedulerPermissions,
  resolveCapability,
  TimeSlot,
  dateService,
  formatMessage,
  resolveMessages,
  resourceService,
  isResource,
  resolveEventColor,
} from '@mintplayer/web-components/scheduler-core';
import { SchedulerStateManager, SchedulerState } from '../state/scheduler-state';
import {
  BaseView,
  formatEventAriaLabel,
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
import { OverlayController } from '@mintplayer/web-components/overlay';

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
      'readonly',
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
  private boundHandleValueChange: (e: Event) => void;

  // Now indicator update timer
  private nowIndicatorTimer: ReturnType<typeof setInterval> | null = null;

  private readonly liveAnnouncer = new LiveAnnouncerController(this);

  /** Day the date popover is open for, or null when it is closed. */
  private popoverDate: Date | null = null;
  /**
   * What the popover lists: one day (month view, or a year mini-day click) or
   * a whole month grouped by day (Space on a year month card, whose focus unit
   * IS the month).
   */
  private popoverScope: 'day' | 'month' = 'day';
  /**
   * Element id of the anchor — resolved lazily on every positioning pass, see
   * `openDayPopover`. A full id rather than a date key because the anchor is
   * view-specific: a month day cell (`scheduler-cell-m-…`) or a year month
   * card (`scheduler-cell-y-…`). Year mini-days are deliberately not focusable
   * (screen readers describe months, not days), so in year view the CARD is
   * the anchor and the focus-return target.
   */
  private popoverAnchorId: string | null = null;
  private boundRepositionPopover: () => void;

  /**
   * The month day popover. Not modal: the grid behind stays operable, Escape and
   * outside clicks dismiss through the shared dismiss stack, and focus lands on
   * the first control inside so the dialog is announced instead of opening
   * silently behind the user's focus.
   */
  private readonly dayPopover = new OverlayController(this, {
    anchor: () => this.popoverAnchorCell(),
    // Same element as the anchor: the day cell IS the trigger. Spelling it out
    // means focus returns to the day even when the popover was opened without
    // anything focused (a programmatic open, or a click on a `tabindex="-1"`
    // cell that some paths do not focus) instead of falling to <body>.
    trigger: () => this.popoverAnchorCell(),
    panel: () => this.shadowRoot?.querySelector<HTMLElement>('.scheduler-day-popover') ?? null,
    // The first EVENT, or failing that the first action — not `'first'`, which
    // is the close button in the header: opening a dialog with focus on "close"
    // means the user's first Enter dismisses what they just asked to see.
    initialFocus: () => {
      const panel = this.shadowRoot?.querySelector('.scheduler-day-popover');
      return (
        panel?.querySelector<HTMLElement>('.popover-event') ??
        panel?.querySelector<HTMLElement>('.popover-action') ??
        null
      );
    },
    modal: false,
    // Dismissal comes from the controller (Escape via the dismiss stack, outside
    // mousedown), so mirror it into our own state or the panel stays rendered.
    onClose: () => {
      this.popoverDate = null;
      this.popoverAnchorId = null;
      this.requestUpdate();
    },
  });

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
    this.boundHandleValueChange = this.handleValueChange.bind(this);
    this.boundRepositionPopover = () => this.dayPopover.position();

    // Subscribe to state changes
    this.stateManager.subscribe((state) => this.onStateChange(state));
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.inputHandler) {
      this.inputHandler.attach();
    }
    // Seed the resolved permission table before the first render so affordances
    // are gated on the very first paint, not one update later. Outside the
    // inputHandler guard on purpose: on the FIRST connect there is no handler
    // yet (it needs the shadow root), which is exactly the render this seeds.
    this.syncPermissions();
    this.addEventListener('keydown', this.boundHandleKeyDown);
    // focusin listener is registered in firstUpdated() once the shadowRoot exists.

    // Start now indicator update timer (every minute)
    this.startNowIndicatorTimer();
  }

  override disconnectedCallback(): void {
    this.inputHandler?.detach();
    this.removeEventListener('keydown', this.boundHandleKeyDown);
    this.shadowRoot?.removeEventListener('focusin', this.boundHandleFocusIn as EventListener);
    this.shadowRoot?.removeEventListener('change', this.boundHandleValueChange);
    this.currentView?.destroy();
    this.dragManager.destroy();

    // Stop now indicator timer
    this.stopNowIndicatorTimer();

    // Stop watching header width
    this.headerResizeObserver?.disconnect();
    this.headerResizeObserver = null;

    this.stopEdgeScroll();

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
      case 'readonly':
        // Coarse read-only switch, reachable from plain HTML/SSR where an options
        // object isn't. Presence = read-only, `readonly="false"` opts out.
        this.syncPermissions();
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

  /**
   * Coarse read-only switch, outranking `options.permissions` entirely.
   *
   * Property and attribute are the same state, deliberately: a JS consumer
   * writes `el.readonly = true`, a plain-HTML or SSR consumer writes the
   * attribute, and a framework wrapper can bridge whichever it has. Absence is
   * editable; `readonly="false"` opts back out so the attribute can be rendered
   * unconditionally with a computed value.
   */
  get readonly(): boolean {
    return this.hasAttribute('readonly') && this.getAttribute('readonly') !== 'false';
  }

  set readonly(value: boolean) {
    if (value) {
      this.setAttribute('readonly', '');
    } else {
      this.removeAttribute('readonly');
    }
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
    // Keep the resolved permission table in step with the options that feed it.
    this.syncPermissions();
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
    this.liveAnnouncer.announce(this.msg('viewChanged', { view: this.viewLabel(view) }));
  }

  /** Localized display name of a view (also the view-switcher button text). */
  private viewLabel(view: ViewType): string {
    const keys: Record<ViewType, keyof SchedulerMessages> = {
      year: 'viewYear',
      month: 'viewMonth',
      week: 'viewWeek',
      day: 'viewDay',
      timeline: 'viewTimeline',
    };
    return this.msg(keys[view]);
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
    this.liveAnnouncer.announce(this.msg('eventAdded', { title: event.title }));
  }

  updateEvent(event: SchedulerEvent): void {
    this.stateManager.updateEvent(event);
    this.liveAnnouncer.announce(this.msg('eventUpdated', { title: event.title }));
  }

  removeEvent(eventId: string): void {
    const ev = this.getEventById(eventId);
    this.stateManager.removeEvent(eventId);
    if (ev) this.liveAnnouncer.announce(this.msg('eventRemoved', { title: ev.title }));
  }

  getEventById(eventId: string): SchedulerEvent | null {
    // One store since the model was normalized: `state.events` already contains
    // events authored under resources, each stamped with its resourceId, so the
    // old resource-tree sweep is redundant.
    return this.stateManager.getState().events.find((e) => e.id === eventId) ?? null;
  }

  refetchEvents(): void {
    this.currentView?.update(this.stateManager.getState());
  }

  /**
   * Localized string lookup: options.messages overrides merged onto the
   * English defaults, with {placeholder} interpolation.
   */
  private msg(
    key: keyof SchedulerMessages,
    params?: Record<string, string | number>,
  ): string {
    return formatMessage(
      resolveMessages(this.stateManager.getState().options.messages)[key],
      params,
    );
  }

  // ============================================
  // Rendering
  // ============================================

  override render(): TemplateResult {
    // Hidden keymap instructions, referenced via aria-describedby from the
    // grid container (grid nav) and from every event element (move/resize
    // discoverability) — PRD scheduler-resize-glyphs FR-9. IDREFs resolve
    // because everything shares this shadow root.
    return html`
      <div class="scheduler-container">
        <header class="scheduler-header"></header>
        <div class="scheduler-content"></div>
      </div>
      <div id="scheduler-kbd-grid" class="visually-hidden">
        ${this.msg(this.can('createEvent') || this.can('selectRange')
          ? 'gridInstructions'
          : 'gridInstructionsReadOnly')}
      </div>
      <div id="scheduler-kbd-event" class="visually-hidden">
        ${this.msg(
          this.can('moveEvent') || this.can('resizeEventStart') ||
          this.can('resizeEventEnd') || this.can('deleteEvent')
            ? 'eventInstructions'
            : 'eventInstructionsReadOnly')}
      </div>
      ${this.renderDayPopover()}
      ${this.liveAnnouncer.template()}
    `;
  }

  /**
   * Day popover for the month view: the day's events plus the two things a user
   * wants from a date they just clicked — create here, or open the day.
   *
   * A sibling of `.scheduler-container`, NOT a child of `.scheduler-content`:
   * the panel is `position: fixed`, so any ancestor with `transform`, `filter`
   * or `contain` would silently become its containing block and the coordinates
   * the OverlayController computes would be wrong. Keep it out here.
   *
   * `role="dialog"` with `modal: false` and no `aria-modal`: the month grid
   * behind it stays perfectly usable, and claiming modality would hide a page
   * that is still visible. It emits NO new event types — activating an entry
   * is `event-selected`, "New event" is `event-create`, "Show day" is the same
   * drill the "+N more" link used to do.
   */
  private renderDayPopover(): TemplateResult | typeof nothing {
    const day = this.popoverDate;
    if (!day) return nothing;

    const state = this.stateManager.getState();
    const { options } = state;
    const scope = this.popoverScope;
    const events = scope === 'month' ? this.eventsInMonth(day) : this.eventsOnDay(day);
    const dateText =
      scope === 'month'
        ? `${dateService.getMonthName(day, options.locale)} ${day.getFullYear()}`
        : dateService.formatDateWithWeekday(day, options.locale);
    const resources = [...state.resourceById.values()];

    return html`
      <div
        class="scheduler-day-popover"
        role="dialog"
        aria-label=${this.msg('dayPopoverLabel', { date: dateText })}
      >
        <div class="popover-head">
          <div>
            <div class="popover-date">${dateText}</div>
            <div class="popover-count">
              ${this.msg('dayPopoverCount', {
                count: events.length,
                events: this.msg(events.length === 1 ? 'eventSingular' : 'eventPlural'),
              })}
            </div>
          </div>
          <button
            type="button"
            class="popover-close"
            aria-label=${this.msg('closePopover')}
            @click=${() => this.closeDayPopover()}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        ${events.length === 0
          ? html`<p class="popover-empty">${this.msg('dayPopoverEmpty')}</p>`
          : scope === 'month'
            ? this.renderPopoverDayGroups(events, options)
            : html`
                <ul class="popover-events">
                  ${events.map((event) => this.renderPopoverEvent(event, options))}
                </ul>
              `}
        ${this.can('createEvent') && resources.length > 0
          ? html`
              <label class="popover-resource">
                <span class="popover-resource-label">${this.msg('newEventResource')}</span>
                <select class="popover-resource-select">
                  <option value="">${this.msg('unassignedResource')}</option>
                  ${resources.map(
                    (resource) => html`<option value=${resource.id}>${resource.title}</option>`,
                  )}
                </select>
              </label>
            `
          : nothing}
        <div class="popover-actions">
          ${this.can('createEvent')
            ? html`<button
                type="button"
                class="popover-action primary"
                @click=${(e: Event) => this.createFromPopover(e)}
              >
                ${this.msg('newEvent')}
              </button>`
            : nothing}
          <button
            type="button"
            class="popover-action"
            @click=${() => this.drillFromPopover()}
          >
            ${this.msg(scope === 'month' ? 'showMonth' : 'showDay')}
          </button>
        </div>
      </div>
    `;
  }

  private renderPopoverEvent(
    event: SchedulerEvent,
    options: SchedulerOptions,
  ): TemplateResult {
    return html`
      <li>
        <button
          type="button"
          class="popover-event"
          aria-label=${formatEventAriaLabel(event, null, options)}
          @click=${(e: Event) => this.selectFromPopover(event, e)}
        >
          <span
            class="popover-event-swatch"
            aria-hidden="true"
            style=${`background:${resolveEventColor(
              event,
              this.stateManager.getState().resourceById,
              options.defaultEventColor,
            )}`}
          ></span>
          <span class="popover-event-title">${event.title}</span>
        </button>
      </li>
    `;
  }

  /**
   * The month-scoped list: events grouped under a heading per day, each event
   * listed once under the day it starts (clamped to the month, so an event
   * running in from last month sits under the 1st rather than vanishing).
   */
  private renderPopoverDayGroups(
    events: SchedulerEvent[],
    options: SchedulerOptions,
  ): TemplateResult {
    const day = this.popoverDate!;
    const monthStart = new Date(day.getFullYear(), day.getMonth(), 1);
    const groups = events.reduce((map, event) => {
      const groupDay = event.start < monthStart ? new Date(monthStart) : new Date(event.start);
      groupDay.setHours(0, 0, 0, 0);
      const key = groupDay.getTime();
      const bucket = map.get(key) ?? { day: groupDay, events: [] as SchedulerEvent[] };
      bucket.events.push(event);
      return map.set(key, bucket);
    }, new Map<number, { day: Date; events: SchedulerEvent[] }>());

    return html`
      <ul class="popover-events popover-day-groups">
        ${[...groups.values()].map(
          (group) => html`
            <li class="popover-day-group">
              <div class="popover-day-label">
                ${dateService.formatDateWithWeekday(group.day, options.locale)}
              </div>
              <ul class="popover-events">
                ${group.events.map((event) => this.renderPopoverEvent(event, options))}
              </ul>
            </li>
          `,
        )}
      </ul>
    `;
  }

  /**
   * The cell/card the popover hangs off, resolved by element id on every call.
   * The views rebuild their cells imperatively, so a cached element would be
   * detached the moment anything re-renders while the popover is open.
   */
  private popoverAnchorCell(): HTMLElement | null {
    if (!this.popoverAnchorId) return null;
    return (
      this.shadowRoot?.querySelector<HTMLElement>(
        `#${this.cssEscape(this.popoverAnchorId)}`,
      ) ?? null
    );
  }

  /**
   * The anchor for a popover opened for `day` in the current view: the day's
   * own cell in month view, its month CARD in year view. Every other view has
   * no date-keyed cell — the popover is a month/year surface only.
   */
  private defaultPopoverAnchorId(day: Date): string {
    return this.stateManager.getState().view === 'year'
      ? `scheduler-cell-y-${YearView.monthKey(day)}`
      : `scheduler-cell-m-${MonthView.dayKey(day)}`;
  }

  /** Every event overlapping the given local day, in start order. */
  private eventsOnDay(day: Date): SchedulerEvent[] {
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return this.stateManager
      .getState()
      .events.filter((event) => event.start < end && event.end > start)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  /**
   * Open the date popover for `day`. Anchored on an element resolved LAZILY by
   * id: the views rebuild their DOM imperatively, so a captured element
   * reference would be detached by the next render while the popover is open.
   *
   * `anchorId` overrides the default when the caller knows better — a year
   * mini-day belonging to an ADJACENT month must anchor on the card it was
   * clicked in, which is not the card its own month key names.
   */
  private async openDayPopover(
    day: Date,
    anchorId?: string,
    scope: 'day' | 'month' = 'day',
  ): Promise<void> {
    this.popoverDate = new Date(day);
    this.popoverScope = scope;
    this.popoverAnchorId = anchorId ?? this.defaultPopoverAnchorId(day);
    this.requestUpdate();
    await this.dayPopover.open();
    // `scroll` does not compose, so the controller's document-level capture
    // listener never sees `.scheduler-content` scrolling inside this shadow
    // root — its 'reposition' strategy is silently dead here. Reposition from a
    // local listener instead.
    this.contentContainer?.addEventListener('scroll', this.boundRepositionPopover, {
      passive: true,
    });
  }

  private closeDayPopover(): void {
    this.contentContainer?.removeEventListener('scroll', this.boundRepositionPopover);
    this.dayPopover.close();
    this.popoverDate = null;
    this.popoverAnchorId = null;
    this.requestUpdate();
  }

  private selectFromPopover(event: SchedulerEvent, originalEvent: Event): void {
    this.closeDayPopover();
    this.stateManager.setSelectedEvent(event);
    this.eventEmitter.emitEventSelected(event, originalEvent);
  }

  private createFromPopover(originalEvent: Event): void {
    const day = this.popoverDate;
    if (!day) return;
    // Read the resource picker BEFORE closing — closing tears the panel down.
    const picker = this.shadowRoot?.querySelector<HTMLSelectElement>(
      '.popover-resource-select',
    );
    const resourceId = picker?.value || undefined;
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    this.closeDayPopover();
    if (!this.can('createEvent') || !this.allowsCreateAt({ start, end }, resourceId)) {
      this.announceDenied();
      return;
    }
    this.eventEmitter.emitEventCreate(
      { start, end },
      this.stateManager.getState().view,
      originalEvent,
      resourceId,
    );
  }

  /** "Show day" / "Show month" — the drill that matches the popover's scope. */
  private drillFromPopover(): void {
    const day = this.popoverDate;
    if (!day) return;
    const scope = this.popoverScope;
    this.closeDayPopover();
    this.stateManager.setDate(new Date(day));
    this.stateManager.setView(scope === 'month' ? 'month' : 'day');
  }

  /** Every event overlapping `day`'s local month, in start order. */
  private eventsInMonth(day: Date): SchedulerEvent[] {
    const start = new Date(day.getFullYear(), day.getMonth(), 1);
    const end = new Date(day.getFullYear(), day.getMonth() + 1, 1);
    return this.stateManager
      .getState()
      .events.filter((event) => event.start < end && event.end > start)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  /**
   * Route a "+N more" activation through `options.moreLinkBehavior`. Returns the
   * date to drill to when the caller should navigate, or null when the behaviour
   * has already been handled here.
   */
  private handleMoreLink(dateKey: string): void {
    const day = this.parseDayKey(dateKey);
    const behavior = this.stateManager.getState().options.moreLinkBehavior ?? 'popover';
    if (typeof behavior === 'function') {
      behavior({ date: day, events: this.eventsOnDay(day) });
      return;
    }
    if (behavior === 'popover') {
      void this.openDayPopover(day);
      return;
    }
    this.stateManager.setDate(day);
    this.stateManager.setView('day');
  }

  protected override firstUpdated(): void {
    const headerEl = this.shadowRoot!.querySelector('.scheduler-header') as HTMLElement;
    this.contentContainer = this.shadowRoot!.querySelector('.scheduler-content') as HTMLElement;

    this.populateHeader(headerEl);
    this.observeHeaderWidth(headerEl);

    // Construct InputHandler now that shadowRoot is available, then attach.
    this.inputHandler = new InputHandler(
      {
        shadowRoot: this.shadowRoot!,
        getEventById: (id) => this.getEventById(id),
        // Pointer gestures ask the same resolver the keyboard paths and the
        // affordance rendering use, so all three can never disagree.
        isEditable: () =>
          this.can('createEvent') || this.can('moveEvent') ||
          this.can('resizeEventStart') || this.can('resizeEventEnd'),
        isSelectable: () => this.can('selectRange') || this.can('createEvent'),
        isEventSelected: (eventId) => this.stateManager.getState().selectedEvent?.id === eventId,
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
    this.shadowRoot!.addEventListener('change', this.boundHandleValueChange);

    this.renderView();
  }

  private populateHeader(header: HTMLElement): void {
    // Navigation
    const nav = document.createElement('nav');
    nav.className = 'scheduler-nav';
    nav.setAttribute('aria-label', this.msg('navLabel'));

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.textContent = '‹';
    prevBtn.setAttribute('aria-label', this.msg('previousPeriod'));
    prevBtn.title = this.msg('previousPeriod');
    prevBtn.addEventListener('click', () => this.prev());

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.textContent = '›';
    nextBtn.setAttribute('aria-label', this.msg('nextPeriod'));
    nextBtn.title = this.msg('nextPeriod');
    nextBtn.addEventListener('click', () => this.next());

    const todayBtn = document.createElement('button');
    todayBtn.type = 'button';
    todayBtn.textContent = this.msg('today');
    todayBtn.setAttribute('aria-label', this.msg('jumpToToday'));
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
    viewSwitcher.setAttribute('aria-label', this.msg('switchView'));

    const views: ViewType[] = ['year', 'month', 'week', 'day', 'timeline'];

    for (const key of views) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = this.viewLabel(key);
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
    const title = (titleEl ?? this.shadowRoot!.querySelector('.scheduler-title')) as HTMLElement | null;
    if (!title) return;

    const state = this.stateManager.getState();
    const { date, view, options } = state;

    // The full title (year included) renders in every view at every width:
    // the narrow layout (D9) gives the title its own full-width centered
    // row, so no compact variant is needed — nowrap + ellipsis is the only
    // last-resort guard.
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

  /** Header width below which the layout wraps and the title compacts (D9). */
  private static readonly NARROW_HEADER_WIDTH = 560;

  private headerResizeObserver: ResizeObserver | null = null;
  private headerIsNarrow = false;

  /**
   * Component-width (not viewport) driven narrow mode — the scheduler can sit
   * in a pane far narrower than the screen (splitter/dock). CSS keys the
   * wrapped layout off [data-narrow]; the title text swap needs JS anyway.
   */
  private observeHeaderWidth(header: HTMLElement): void {
    if (typeof ResizeObserver === 'undefined') return;
    this.headerResizeObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? header.clientWidth;
      const narrow = width < MpScheduler.NARROW_HEADER_WIDTH;
      if (narrow === this.headerIsNarrow) return;
      this.headerIsNarrow = narrow;
      // Mutating layout inside the RO callback (wrap changes the header's own
      // size) trips the browser's "undelivered notifications" loop guard —
      // apply one frame later instead.
      requestAnimationFrame(() => {
        header.toggleAttribute('data-narrow', narrow);
      });
    });
    this.headerResizeObserver.observe(header);
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
    // Async loading is invisible to a screen reader without an announcement;
    // say both edges so a slow fetch has a beginning and an end.
    if (state.isLoading !== this.previousIsLoading) {
      if (this.previousIsLoading !== null) {
        this.liveAnnouncer.announce(this.msg(state.isLoading ? 'loadingEvents' : 'eventsLoaded'));
      }
      this.previousIsLoading = state.isLoading;
    }
    this.detectAndEmitChanges(state);
    this.updateUI(state);
  }

  private previousIsLoading: boolean | null = null;

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
    this.updateEdgeScroll(pointer);
  }

  private handlePointerUp(pointer: NormalizedPointerEvent): void {
    this.stopEdgeScroll();
    const result = this.dragManager.handlePointerUp(pointer);

    if (result) {
      this.handleDragComplete(result, pointer.originalEvent);
    }
  }

  // ============================================
  // Edge auto-scroll during a drag
  // ============================================

  /** Distance from a scroller edge at which auto-scroll engages. */
  private static readonly EDGE_SCROLL_ZONE_PX = 40;
  /** Fastest scroll step, in px per frame, reached at the very edge. */
  private static readonly EDGE_SCROLL_MAX_PX = 18;

  private edgeScrollFrame: number | null = null;
  private edgeScrollVector: { x: number; y: number } = { x: 0, y: 0 };
  private edgeScrollPointer: NormalizedPointerEvent | null = null;

  /**
   * Scroll the grid when a drag reaches the edge of the viewport.
   *
   * Without this, a drag can only ever reach what is already on screen — and
   * since the timeline is now genuinely wider than the viewport (7 days x 48
   * slots), "drag an event to next Thursday" became impossible rather than
   * merely awkward. Both axes, because the timeline scrolls horizontally and the
   * time grids vertically.
   *
   * Speed ramps with how deep into the edge zone the pointer is, the way every
   * drag-and-drop implementation does it: a constant rate is either too slow to
   * be useful or too fast to aim. Each frame re-feeds the pointer to the drag
   * machine so the preview keeps tracking the slot under the cursor while the
   * grid moves beneath it.
   */
  private updateEdgeScroll(pointer: NormalizedPointerEvent): void {
    const container = this.contentContainer;
    if (!container || !this.dragManager.isDragging()) {
      this.stopEdgeScroll();
      return;
    }

    const rect = container.getBoundingClientRect();
    const zone = MpScheduler.EDGE_SCROLL_ZONE_PX;
    const max = MpScheduler.EDGE_SCROLL_MAX_PX;
    // Ramp: 0 at the zone boundary, `max` at the edge (and beyond it, clamped).
    const axis = (position: number, low: number, high: number): number => {
      if (position < low + zone) return -Math.min(1, (low + zone - position) / zone) * max;
      if (position > high - zone) return Math.min(1, (position - (high - zone)) / zone) * max;
      return 0;
    };

    this.edgeScrollVector = {
      x: axis(pointer.clientX, rect.left, rect.right),
      y: axis(pointer.clientY, rect.top, rect.bottom),
    };
    this.edgeScrollPointer = pointer;

    if (this.edgeScrollVector.x === 0 && this.edgeScrollVector.y === 0) {
      this.stopEdgeScroll();
      return;
    }
    if (this.edgeScrollFrame === null) this.scheduleEdgeScroll();
  }

  private scheduleEdgeScroll(): void {
    this.edgeScrollFrame = requestAnimationFrame(() => {
      this.edgeScrollFrame = null;
      const container = this.contentContainer;
      const pointer = this.edgeScrollPointer;
      if (!container || !pointer || !this.dragManager.isDragging()) return;

      const beforeX = container.scrollLeft;
      const beforeY = container.scrollTop;
      container.scrollLeft = beforeX + this.edgeScrollVector.x;
      container.scrollTop = beforeY + this.edgeScrollVector.y;

      // Nothing moved (already at the end) — stop rather than spin a frame loop.
      if (container.scrollLeft === beforeX && container.scrollTop === beforeY) return;

      // Re-resolve the slot under the unchanged pointer position: the content
      // moved, so the same coordinates now name a different slot.
      this.dragManager.handlePointerMove(pointer);
      this.scheduleEdgeScroll();
    });
  }

  private stopEdgeScroll(): void {
    if (this.edgeScrollFrame !== null) {
      cancelAnimationFrame(this.edgeScrollFrame);
      this.edgeScrollFrame = null;
    }
    this.edgeScrollVector = { x: 0, y: 0 };
    this.edgeScrollPointer = null;
  }

  /**
   * Two activations of the same event within this window = a double
   * click/tap. Native dblclick cannot be relied on here: the first click's
   * selection re-render replaces the event node, which resets the browser's
   * double-click tracking — so `event-dblclick` is synthesized from
   * consecutive activations instead (and works for touch double-tap too).
   */
  private static readonly DBLCLICK_WINDOW_MS = 500;
  private lastEventActivation: { eventId: string; time: number } | null = null;

  private registerEventActivation(event: SchedulerEvent, originalEvent: Event): void {
    const now = Date.now();
    const prev = this.lastEventActivation;
    this.lastEventActivation = { eventId: event.id, time: now };
    if (prev && prev.eventId === event.id && now - prev.time < MpScheduler.DBLCLICK_WINDOW_MS) {
      this.lastEventActivation = null;
      this.eventEmitter.emitEventDblClick(event, originalEvent);
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
        this.registerEventActivation(result.event, originalEvent);
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
          // `null` (created in the bucket row) maps to "no resource" on the
          // wire — the emitted field stays `string | undefined`.
          result.preview.resourceId ?? undefined,
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
          // A MOVE preview carries the row the pointer ended on (tri-state):
          // a string reassigns, `null` (the bucket row) UN-assigns, and
          // `undefined` — every resize, and any view without a resource axis —
          // leaves the event's own resource untouched.
          if (result.preview.resourceId !== undefined) {
            if (result.preview.resourceId === null) delete updatedEvent.resourceId;
            else updatedEvent.resourceId = result.preview.resourceId;
          }
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

    // Resource-tree actions (timeline). Handled before anything else and
    // returning early: these buttons live inside the pinned rowheader, so a
    // fall-through would also read the row as a date/slot click.
    if (this.handleResourceAction(targetEl, pointer.originalEvent)) return;

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

    // More link — checked BEFORE the date click below, because the link sits
    // inside a cell that also carries `data-date` and would otherwise be read
    // as a plain day click as well as a "+N more" activation.
    const moreLink = targetEl.closest('.scheduler-more-link') as HTMLElement;
    if (moreLink) {
      const dateStr = moreLink.dataset['date'];
      if (dateStr) {
        this.handleMoreLink(dateStr);
        return;
      }
    }

    // Date click
    const dayEl = targetEl.closest('[data-date]') as HTMLElement;
    if (dayEl) {
      const dateStr = dayEl.dataset['date'];
      if (dateStr) {
        const day = this.parseDayKey(dateStr);
        this.eventEmitter.emitDateClick(day, pointer.originalEvent);

        // The day NUMBER is its own target and always drills into the day view
        // (the navLinks idiom). Keeping it separate from the rest of the cell is
        // what lets a plain cell click keep meaning "do something with this day"
        // — conflate them and an empty cell can never mean "create here".
        if (targetEl.closest('.day-number')) {
          this.stateManager.setDate(day);
          this.stateManager.setView('day');
          return;
        }

        // Default 'popover' (phase 2 — the surface this click exists for);
        // `date-click` has already been emitted above, so a consumer's own
        // handler keeps working either way, and 'none' opts back out.
        if (this.stateManager.getState().options.dayClickAction === 'popover') {
          // A year mini-day anchors on the CARD it was clicked in — its own
          // month key can name a card that does not exist (an adjacent-month
          // day in the January/December corners), which is exactly the
          // unpositioned-panel bug this parameter closes.
          const card = targetEl.closest('.scheduler-year-month') as HTMLElement | null;
          void this.openDayPopover(day, card?.id);
          return;
        }
      }
    }

    // Month click in year view
    const monthHeader = targetEl.closest(
      '.scheduler-year-month-header'
    ) as HTMLElement;
    if (monthHeader) {
      const monthStr = monthHeader.dataset['month'];
      if (monthStr) {
        this.stateManager.setDate(this.parseDayKey(monthStr));
        this.stateManager.setView('month');
      }
    }

    // Event click — also drives the keyboard-move tab stop. The drag flow
    // already calls setSelectedEvent on commit, but a plain click on an
    // event needs to select it too so the focus model can land on it.
    // (This is the TOUCH tap path — registerEventActivation makes a quick
    // double-tap emit event-dblclick, same as mouse double-click.)
    if (target.type === 'event' && target.event) {
      this.stateManager.setSelectedEvent(target.event);
      this.registerEventActivation(target.event, pointer.originalEvent);
    }
  }

  /**
   * Route a click on a resource-tree action button to its request event.
   * Returns true when the click was one of ours and must not fall through.
   *
   * Every branch re-checks the capability rather than trusting that the button
   * exists: state can change between render and click, and a request the
   * consumer has switched off must not reach them.
   */
  private handleResourceAction(targetEl: HTMLElement, originalEvent: Event): boolean {
    const button = targetEl.closest('[data-action]') as HTMLElement | null;
    if (!button) return false;

    const { action, parentId, resourceId } = button.dataset;
    const view = this.stateManager.getState().view;

    switch (action) {
      case 'add-resource':
        if (this.can('createResource')) {
          this.eventEmitter.emitResourceCreate('resource', view, originalEvent, parentId);
        }
        return true;
      case 'add-group':
        if (this.can('createGroup')) {
          this.eventEmitter.emitResourceCreate('group', view, originalEvent, parentId);
        }
        return true;
      case 'delete-resource': {
        const resource = resourceId ? this.findResourceOrGroup(resourceId) : null;
        if (resource && this.can('deleteResource')) {
          this.eventEmitter.emitResourceDelete(resource, originalEvent);
        }
        return true;
      }
      // The colour input reports through `change`, not `click` — a click merely
      // opens the platform picker, so swallow it here and let handleValueChange
      // emit once the user has actually chosen.
      case 'set-resource-color':
        return true;
    }
    return false;
  }

  /**
   * `change` from a resource control. Delegated on the shadow root because the
   * views build their DOM imperatively and are rebuilt on every render — a
   * per-element listener would have to be re-attached each time. `change` does
   * not compose, so this listener is the only one that can see it.
   */
  private handleValueChange(e: Event): void {
    const input = (e.composedPath?.()[0] ?? e.target) as HTMLElement | null;
    if (!input || input.dataset['action'] !== 'set-resource-color') return;
    if (!this.can('updateResource')) return;

    const { resourceId, field } = input.dataset;
    const resource = resourceId ? this.findResourceOrGroup(resourceId) : null;
    if (!resource) return;

    const value = (input as HTMLInputElement).value;
    this.eventEmitter.emitResourceUpdate(
      resource,
      field === 'eventColor' ? { eventColor: value } : { color: value },
      e,
    );
  }

  /** Resolve a resource or group by id from the current `resources` input. */
  private findResourceOrGroup(id: string): Resource | ResourceGroup | null {
    return resourceService.findById(this.stateManager.getState().resources, id) ?? null;
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
        !target.classList.contains('scheduler-timeline-event') &&
        !target.classList.contains('scheduler-month-event')) {
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
    // The popover owns the keyboard while it is open. Escape especially: this
    // listener sits on the host and therefore runs BEFORE the controller's
    // document-level one, so without this the selection would be cleared and the
    // popover left open.
    if (this.dayPopover.isOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.closeDayPopover();
      }
      return;
    }

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

    // Enter/Space on the drill-down controls (the "+N more" link and the year
    // view's month headers) — plain rendered nodes with role="button", so
    // activation cannot be native and is replayed from the click delegation.
    if ((e.key === 'Enter' || e.key === ' ') && this.activateFocusedDrillControl()) {
      e.preventDefault();
      return;
    }

    const kind = this.getFocusedKind();
    if (kind === 'cell') {
      this.handleCellKeyDown(e);
    } else if (kind === 'event') {
      this.handleEventKeyDown(e);
    }
  }

  /** Keyboard face of the more-link / year-month-header click delegation. */
  private activateFocusedDrillControl(): boolean {
    const active = this.shadowRoot?.activeElement as HTMLElement | null;
    if (!active) return false;

    if (active.classList.contains('scheduler-more-link')) {
      const dateStr = active.dataset['date'];
      if (!dateStr) return false;
      this.handleMoreLink(dateStr);
      return true;
    }
    if (active.classList.contains('scheduler-year-month-header')) {
      const monthStr = active.dataset['month'];
      if (!monthStr) return false;
      this.stateManager.setDate(this.parseDayKey(monthStr));
      this.stateManager.setView('month');
      return true;
    }
    return false;
  }

  private getFocusedKind(): 'cell' | 'event' | 'other' {
    const active = this.shadowRoot?.activeElement as HTMLElement | null;
    if (!active) return 'other';
    if (
      active.classList.contains('scheduler-time-slot') ||
      active.classList.contains('scheduler-timeline-slot') ||
      active.classList.contains('scheduler-month-day') ||
      active.classList.contains('scheduler-year-month')
    ) {
      return 'cell';
    }
    if (
      active.classList.contains('scheduler-event') ||
      active.classList.contains('scheduler-timeline-event') ||
      active.classList.contains('scheduler-month-event')
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

  /**
   * Resolve a capability against `readonly`, `options.permissions` and any
   * per-event override.
   *
   * A boolean lookup, deliberately: it runs on every pointer-down and on every
   * render that decides whether to draw an affordance.
   */
  private can(capability: SchedulerCapability, event?: SchedulerEvent | null): boolean {
    const { options } = this.stateManager.getState();
    return resolveCapability(capability, {
      permissions: this.effectivePermissions(options),
      event: event ?? null,
    });
  }

  /** Recompute the resolved table onto state so views can gate affordances. */
  private syncPermissions(): void {
    const { options } = this.stateManager.getState();
    this.stateManager.setState({
      resolvedPermissions: this.effectivePermissions(options),
    });
  }

  /**
   * The effective permission table: the `readonly` host attribute outranks
   * everything, then `options.permissions`. Per-capability defaults are applied
   * inside `resolveCapability`, so an unspecified capability keeps its documented
   * default rather than being treated as denied.
   */
  private effectivePermissions(
    options: SchedulerOptions,
  ): boolean | Partial<SchedulerPermissions> {
    if (this.readonly) return false;
    const explicit = options.permissions;
    if (explicit === false) return false;
    return typeof explicit === 'object' && explicit !== null ? explicit : {};
  }

  /**
   * The one optional consumer predicate, for data-dependent create rules.
   *
   * Evaluated ONLY at commit points (this call site, drag completion, Enter) —
   * never per cell and never per pointer-move, so a consumer callback can't land
   * on the render path. Slot greying is deliberately not driven by it.
   */
  private allowsCreateAt(
    range: { start: Date; end: Date },
    resourceId?: string,
  ): boolean {
    const { permissions } = this.stateManager.getState().options;
    if (typeof permissions !== 'object' || permissions === null) return true;
    return permissions.canCreateAt?.(range, resourceId) ?? true;
  }

  /** Enter move mode only if the event may actually be moved or resized. */
  private tryEnterEventMoveMode(ev: SchedulerEvent): void {
    const canMove = this.can('moveEvent', ev);
    const canResize =
      this.can('resizeEventStart', ev) || this.can('resizeEventEnd', ev);
    if (!canMove && !canResize) {
      this.announceDenied();
      return;
    }
    this.enterEventMoveMode(ev);
  }

  /**
   * Announce a refused command. Silence on a keypress reads as a broken widget,
   * so denial gets its own polite message rather than nothing.
   */
  private announceDenied(): void {
    this.liveAnnouncer.announce(this.msg('actionNotAllowed'));
  }

  private handleEventKeyDown(e: KeyboardEvent): void {
    const state = this.stateManager.getState();
    const ev = state.selectedEvent;
    if (!ev) return;
    switch (e.key) {
      // M is the canonical move-mode key across the workspace (tile-manager,
      // dock); Enter is kept for back-compat (screen-reader programme D4).
      case 'm':
      case 'M': {
        if (e.altKey || e.ctrlKey || e.metaKey) break;
        e.preventDefault();
        this.tryEnterEventMoveMode(ev);
        return;
      }
      case 'Enter':
        e.preventDefault();
        this.tryEnterEventMoveMode(ev);
        return;
      case 'Delete':
      case 'Backspace':
        e.preventDefault();
        // Gated: the old `editable` flag blocked only POINTER gestures, so a
        // read-only scheduler still deleted on a keypress.
        if (!this.can('deleteEvent', ev)) {
          this.announceDenied();
          return;
        }
        this.eventEmitter.emitEventDelete(ev);
        return;
      case 'Escape':
        e.preventDefault();
        this.focusFocusedCell();
        return;
      case 'ArrowLeft':
        e.preventDefault();
        this.focusAdjacentEvent(ev, -1);
        return;
      case 'ArrowRight':
        e.preventDefault();
        this.focusAdjacentEvent(ev, +1);
        return;
    }
  }

  /**
   * Inter-event arrow nav (PRD scheduler-controlled-selection §5.3): walk
   * the events in document order (start time, with id as tiebreaker) by ±1.
   * No wrap at the ends — matches the APG list/feed pattern.
   */
  private focusAdjacentEvent(current: SchedulerEvent, direction: 1 | -1): void {
    const state = this.stateManager.getState();
    const ordered = [...state.events].sort((a, b) => {
      const dt = a.start.getTime() - b.start.getTime();
      return dt !== 0 ? dt : a.id.localeCompare(b.id);
    });
    const idx = ordered.findIndex((e) => e.id === current.id);
    if (idx < 0) return;
    const target = ordered[idx + direction];
    if (!target) return; // boundary — no wrap.
    const root = this.shadowRoot;
    if (!root) return;
    const el = root.querySelector(
      `[data-event-id="${this.cssEscape(target.id)}"]`,
    ) as HTMLElement | null;
    el?.focus({ preventScroll: false });
  }

  private handleCellKeyDown(e: KeyboardEvent): void {
    const state = this.stateManager.getState();
    // Month + year views have their own focus model — `focusedDate` (a whole
    // day or month) rather than `focusedCell` (a time slot) — and route
    // through dedicated handlers per PRD scheduler-controlled-selection §5.
    if (state.view === 'month') {
      this.handleMonthCellKeyDown(e);
      return;
    }
    if (state.view === 'year') {
      this.handleYearCellKeyDown(e);
      return;
    }
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

  /**
   * Month-view keyboard handler (PRD scheduler-controlled-selection §5.1).
   * Arrows walk days; ArrowUp/Down ± one week; cross-month moves auto-
   * advance the displayed date so the new month renders. Enter emits
   * `event-create` for the focused day's full range.
   */
  private handleMonthCellKeyDown(e: KeyboardEvent): void {
    // Always re-seed from the active element so click / programmatic-focus
    // moves win over any stale `focusedDate` that lingered from a prior
    // view. (Cheap; the alternative would be to clear `focusedDate` on
    // view-change, which loses the user's last position when they bounce
    // back.)
    this.syncFocusedDateFromActive();
    switch (e.key) {
      case 'ArrowLeft':  e.preventDefault(); this.moveFocusedDateByDays(-1); return;
      case 'ArrowRight': e.preventDefault(); this.moveFocusedDateByDays(+1); return;
      case 'ArrowUp':    e.preventDefault(); this.moveFocusedDateByDays(-7); return;
      case 'ArrowDown':  e.preventDefault(); this.moveFocusedDateByDays(+7); return;
      case 'Enter':      e.preventDefault(); this.commitFocusedDateAsCreate(e, 'day'); return;
      // Space, not Enter: Enter already means "create for this day" and taking
      // it would remove the only keyboard create path in this view.
      case ' ': {
        e.preventDefault();
        const focused = this.stateManager.getState().focusedDate;
        if (focused) void this.openDayPopover(focused);
        return;
      }
    }
  }

  /**
   * Year-view keyboard handler (PRD scheduler-controlled-selection §5.2).
   * The focus unit is a month — ArrowLeft/Right ± 1, ArrowUp/Down ± 3 to
   * mirror the visual 4×3 layout. Cross-year auto-advances. Enter emits
   * `event-create` for the focused month's full range.
   */
  private handleYearCellKeyDown(e: KeyboardEvent): void {
    this.syncFocusedDateFromActive();
    switch (e.key) {
      case 'ArrowLeft':  e.preventDefault(); this.moveFocusedDateByMonths(-1); return;
      case 'ArrowRight': e.preventDefault(); this.moveFocusedDateByMonths(+1); return;
      case 'ArrowUp':    e.preventDefault(); this.moveFocusedDateByMonths(-3); return;
      case 'ArrowDown':  e.preventDefault(); this.moveFocusedDateByMonths(+3); return;
      // Drill into the month, matching what clicking the month header does.
      // Enter used to emit a MONTH-SPANNING event-create here, which no consumer
      // could reasonably want from a year overview.
      case 'Enter': {
        e.preventDefault();
        const focused = this.stateManager.getState().focusedDate;
        if (focused) {
          this.stateManager.setDate(new Date(focused));
          this.stateManager.setView('month');
        }
        return;
      }
      // The keyboard face of clicking a mini-day, at the card's own
      // granularity: a MONTH-scoped popover (events grouped by day). Mini-days
      // stay unfocusable by design, so the panel is where a keyboard user gets
      // day-level detail without a ~500-cell grid.
      case ' ': {
        e.preventDefault();
        const state = this.stateManager.getState();
        const focused = state.focusedDate ?? state.date;
        void this.openDayPopover(focused, undefined, 'month');
        return;
      }
    }
  }

  /**
   * Sync `focusedDate` from the currently-active month/year cell. Runs at
   * the top of every Phase B keydown so click-driven and Tab-driven focus
   * moves are reflected in state before arrow keys read it.
   */
  private syncFocusedDateFromActive(): void {
    const active = this.shadowRoot?.activeElement as HTMLElement | null;
    if (!active) return;
    const dateStr = active.dataset['date'] ?? active.dataset['month'];
    if (!dateStr) return;
    this.stateManager.setFocusedDate(this.parseDayKey(dateStr));
  }

  private moveFocusedDateByDays(deltaDays: number): void {
    const state = this.stateManager.getState();
    const current = state.focusedDate ?? state.date;
    const next = new Date(current);
    next.setDate(next.getDate() + deltaDays);
    this.commitFocusedDate(next);
  }

  private moveFocusedDateByMonths(deltaMonths: number): void {
    const state = this.stateManager.getState();
    const current = state.focusedDate ?? state.date;
    const next = new Date(current);
    next.setMonth(next.getMonth() + deltaMonths);
    this.commitFocusedDate(next);
  }

  /**
   * Apply a focused-date update. If the new date crosses the displayed
   * period (different month on month view; different year on year view),
   * also bump `state.date` so the view re-renders to the new period —
   * APG date-picker auto-advance behaviour. Then schedule a focus
   * restoration on the matching cell after the next render.
   */
  private commitFocusedDate(next: Date): void {
    const state = this.stateManager.getState();
    let advanceTo: Date | null = null;
    if (state.view === 'month') {
      const sameMonth =
        next.getFullYear() === state.date.getFullYear() &&
        next.getMonth() === state.date.getMonth();
      if (!sameMonth) advanceTo = next;
    } else if (state.view === 'year') {
      if (next.getFullYear() !== state.date.getFullYear()) advanceTo = next;
    }
    if (advanceTo) {
      // setDate triggers the view to re-render with the new month/year, then
      // we set the focused date so the renderer's tabindex update catches it.
      this.stateManager.setDate(new Date(advanceTo));
    }
    this.stateManager.setFocusedDate(next);
    // Within-period nav: the target cell is already in the DOM, focus it
    // synchronously so the next keydown sees the right `activeElement`.
    // Cross-period nav: the cell only exists after Lit re-renders, so the
    // rAF re-tries focus on the next frame. The two together cover both
    // cases without flicker.
    this.scrollAndFocusDateCell(next);
    if (advanceTo) {
      requestAnimationFrame(() => this.scrollAndFocusDateCell(next));
    }
  }

  /**
   * Find the month/year date-cell DOM element by id and focus it. Keys are
   * built from *local* date components to match `MonthView.dayKey()` /
   * `YearView.monthKey()` — see those helpers for why ISO is unsafe across
   * non-UTC timezones.
   */
  private scrollAndFocusDateCell(date: Date): void {
    const state = this.stateManager.getState();
    const root = this.shadowRoot;
    if (!root) return;
    const yyyymm = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const id =
      state.view === 'year'
        ? `scheduler-cell-y-${yyyymm}`
        : `scheduler-cell-m-${yyyymm}-${String(date.getDate()).padStart(2, '0')}`;
    const el = root.getElementById(id) as HTMLElement | null;
    if (!el) return;
    el.focus({ preventScroll: true });
    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }

  /**
   * Emit `event-create` covering the focused day (month view) or focused
   * month (year view). No internal mutation per PRD
   * scheduler-controlled-selection — consumer constructs the actual event.
   */
  private commitFocusedDateAsCreate(originalEvent: Event, unit: 'day' | 'month'): void {
    const state = this.stateManager.getState();
    const focused = state.focusedDate;
    if (!focused) return;
    const start = new Date(focused);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    if (unit === 'day') {
      end.setDate(end.getDate() + 1);
    } else {
      end.setMonth(end.getMonth() + 1);
    }
    if (!this.can('createEvent') || !this.allowsCreateAt({ start, end })) {
      this.announceDenied();
      return;
    }
    this.eventEmitter.emitEventCreate(
      { start, end },
      state.view,
      originalEvent,
    );
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
      this.liveAnnouncer.announce(formatSelectionAnnouncement(newState, slotDuration));
    } else {
      this.stateManager.setFocusedCell(cell, resourceId, true);
      const resourceTitle = this.getResourceTitle(resourceId);
      this.liveAnnouncer.announce(formatCellAnnouncement(cell, state.options, resourceTitle));
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

  /**
   * Parse a `YYYY-MM-DD` day key as a LOCAL date.
   *
   * `new Date('2026-07-31')` is parsed per spec as UTC midnight, so in every
   * timezone west of UTC it lands on the previous local day — month view writes
   * these keys from local components, so Enter on Jul 31 in New York emitted
   * `event-create` for Jul 30 and focus restoration missed the cell entirely.
   * Full ISO strings (year view's `data-month`) round-trip fine and still work
   * through this function.
   */
  private parseDayKey(value: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return new Date(value);
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
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
    // Check BEFORE emitting and before announcing: the announcement used to
    // confirm a commit that permissions may refuse.
    if (!this.can('createEvent') || !this.allowsCreateAt({ start, end }, resourceId)) {
      this.announceDenied();
      return;
    }
    this.eventEmitter.emitEventCreate(
      { start, end },
      state.view,
      originalEvent,
      resourceId,
    );
    this.liveAnnouncer.announce(this.msg('selectionCommitted', {
      start: dateService.formatTime(start, state.options.timeFormat),
      end: dateService.formatTime(end, state.options.timeFormat),
    }));
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
      this.msg('moveModeEntered', { title: event.title, minutes }),
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
    this.liveAnnouncer.announce(formatMoveAnnouncement(newStart, newEnd, this.stateManager.getState().options));
  }

  /** Walk to the next/previous resource (timeline only). Updates the preview's resourceId. */
  private nudgeKeyboardMoveResource(direction: 1 | -1): void {
    if (!this.keyboardMove) return;
    const next = this.adjacentResource(this.keyboardMove.workingResourceId, direction, this.stateManager.getState());
    if (!next) return;
    this.keyboardMove.workingResourceId = next;
    this.applyKeyboardMovePreview();
    const title = this.getResourceTitle(next) ?? next;
    this.liveAnnouncer.announce(this.msg('movedToResource', { resource: title }));
  }

  /**
   * Resize one edge of the working event. Clamps to a minimum duration of
   * one slot to keep the event valid, and refuses to invert (start ≤ end).
   */
  private resizeKeyboardMoveEdge(edge: 'start' | 'end', deltaMs: number): void {
    if (!this.keyboardMove) return;
    // Move mode ignored event.draggable/resizable and the global flags entirely,
    // so a resizable:false event was freely keyboard-resizable.
    const source = this.getEventById(this.keyboardMove.eventId);
    if (!this.can(edge === 'start' ? 'resizeEventStart' : 'resizeEventEnd', source)) {
      this.announceDenied();
      return;
    }
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
    this.liveAnnouncer.announce(formatResizeAnnouncement(newStart, newEnd, edge, this.stateManager.getState().options));
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
      this.liveAnnouncer.announce(this.msg('moveCommitted'));
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
    this.liveAnnouncer.announce(this.msg('moveCancelled'));
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

    // Carry the row's resource so a drag can report where it is happening.
    // Tri-state: a resource row names itself, the bucket row is `null` (its
    // slots carry `data-unassigned`), and a slot with neither belongs to a
    // view without a resource axis (`undefined`).
    const resourceId =
      el.dataset['resourceId'] ?? (el.dataset['unassigned'] ? null : undefined);

    return {
      start: new Date(startStr),
      end: new Date(endStr),
      ...(resourceId !== undefined ? { resourceId } : {}),
    };
  }
}

// Register the custom element
if (typeof customElements !== 'undefined' && !customElements.get('mp-scheduler')) {
  customElements.define('mp-scheduler', MpScheduler);
}
