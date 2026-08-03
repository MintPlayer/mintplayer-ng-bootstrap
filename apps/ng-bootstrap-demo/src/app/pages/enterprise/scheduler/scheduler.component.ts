import { Component, model, signal, computed, ChangeDetectionStrategy, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCardBodyComponent, BsCardComponent, BsCardHeaderComponent } from '@mintplayer/ng-bootstrap/card';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
import {
  BsSchedulerComponent,
  SchedulerEventSelectedEvent,
  SchedulerEventCreateEvent,
  SchedulerEventUpdateEvent,
  SchedulerEventDeleteEvent,
  SchedulerResourceCreateEvent,
  SchedulerResourceUpdateEvent,
  SchedulerResourceDeleteEvent,
  DateClickEvent,
} from '@mintplayer/ng-bootstrap/scheduler';
import {
  ViewType,
  SchedulerEvent,
  Resource,
  ResourceGroup,
  SchedulerOptions,
  SchedulerMessages,
  generateEventId,
  generateResourceId,
  generateGroupId,
} from '@mintplayer/web-components/scheduler-core';

@Component({
  selector: 'demo-scheduler',
  templateUrl: './scheduler.component.html',
  styleUrls: ['./scheduler.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    BsCardComponent,
    BsCardHeaderComponent,
    BsCardBodyComponent,
    BsFormComponent,
    BsFormControlDirective,
    BsGridComponent,
    BsGridRowDirective,
    BsGridColumnDirective,
    BsInputGroupComponent,
    BsButtonTypeDirective,
    BsSelectComponent,
    BsSelectOption,
    BsSchedulerComponent,
    BsCodeSnippetComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulerComponent {
  colors = Color;

  // Reference to the scheduler so we can call `clearSelection()` after
  // committing — per PRD scheduler-controlled-selection the WC no longer
  // auto-clears, so the demo (or any consumer) decides when to.
  private schedulerComponent = viewChild<BsSchedulerComponent>(BsSchedulerComponent);

  // View state — model() (not signal()) because both are banana-in-a-box
  // bound to the scheduler, which navigates internally.
  view = model<ViewType>('week');
  date = model<Date>(new Date());

  // Configuration
  slotDuration = signal<number>(1800); // 30 minutes
  timeFormat = signal<'12h' | '24h' | undefined>(undefined); // undefined = follow the locale
  firstDayOfWeek = signal<0 | 1 | undefined>(undefined); // undefined = follow the locale

  /**
   * Language switch. `undefined` means "use the browser's own locale", which is
   * the component's default and what most apps should ship. The other two pin a
   * locale explicitly, which is how you override a user's browser.
   */
  locale = signal<string | undefined>(undefined);

  /**
   * A partial translation table. Only the keys an app cares about need
   * overriding; everything else falls back to the English defaults. Dates and
   * times are NOT in here — those follow `locale` through Intl for free.
   */
  private readonly dutchMessages: Partial<SchedulerMessages> = {
    today: 'Vandaag',
    viewYear: 'Jaar',
    viewMonth: 'Maand',
    viewWeek: 'Week',
    viewDay: 'Dag',
    viewTimeline: 'Tijdlijn',
    resourcesHeader: 'Resources',
    unassignedResource: '(Geen resource)',
    addResource: 'Resource toevoegen',
    addGroup: 'Groep toevoegen',
    rowMenuLabel: 'Acties voor {title}',
    rowMenuDialogLabel: 'Acties voor {title}',
    removeResource: '{title} verwijderen',
    resourceColor: 'Kleur voor {title}',
    editorSave: 'Opslaan',
    editorCancel: 'Annuleren',
    editorDelete: 'Verwijderen',
    editorTitleLabel: 'Titel',
    editorStartLabel: 'Begin',
    editorEndLabel: 'Einde',
    openDayView: '{date} openen',
    // The keymap a screen reader reads out. Per-view, because the keys really
    // do differ: in year view Enter opens the focused month rather than
    // creating anything, and Space is the only route to the popover in both
    // month and year.
    gridInstructionsMonth:
      'Gebruik de pijltjestoetsen om tussen dagen te bewegen. Druk op Enter om een nieuw item op de gefocuste dag aan te vragen, en op de spatiebalk om de items van die dag te tonen. Page Up en Page Down wijzigen de maand. Alt met T, Y, M, W of D schakelt naar vandaag, jaar, maand, week of dag.',
    gridInstructionsMonthReadOnly:
      'Gebruik de pijltjestoetsen om tussen dagen te bewegen. Druk op de spatiebalk om de items van de gefocuste dag te tonen. Page Up en Page Down wijzigen de maand. Alt met T, Y, M, W of D schakelt naar vandaag, jaar, maand, week of dag.',
    gridInstructionsYear:
      'Gebruik de pijltjestoetsen om tussen maanden te bewegen. Druk op Enter om de gefocuste maand te openen, en op de spatiebalk om de items ervan te tonen. Page Up en Page Down wijzigen het jaar. Alt met T, Y, M, W of D schakelt naar vandaag, jaar, maand, week of dag.',
  };

  /**
   * The placeholder option means "unset" — follow the browser. It arrives as
   * null (mp-select normalizes an empty value) or '' (the write-back path), so
   * both collapse to undefined.
   */
  setLocale(value: string | null): void {
    this.locale.set(value || undefined);
  }

  setTimeFormat(value: string | null): void {
    this.timeFormat.set((value || undefined) as '12h' | '24h' | undefined);
  }

  // Options computed from signals
  options = computed<Partial<SchedulerOptions>>(() => ({
    slotDuration: this.slotDuration(),
    timeFormat: this.timeFormat(),
    firstDayOfWeek: this.firstDayOfWeek(),
    locale: this.locale(),
    messages: this.locale()?.startsWith('nl') ? this.dutchMessages : undefined,
    nowIndicator: true,
    moreLinkBehavior: this.moreLinkBehavior(),
    dayClickAction: this.dayClickAction(),
    // Resource-tree capabilities are OFF by default in the component; this is
    // what opting in looks like. Read-only rides the `[readonly]` attribute
    // instead, which outranks everything here.
    permissions:
      this.permissionMode() === 'resource-admin'
        ? {
            createResource: true,
            createGroup: true,
            updateResource: true,
            deleteResource: true,
          }
        : {},
  }));

  // Events and resources
  events = signal<SchedulerEvent[]>([]);
  resources = signal<(Resource | ResourceGroup)[]>([]);

  // Selection state
  selectedEvent = model<SchedulerEvent | null>(null);

  // Event log
  eventLog = signal<string[]>([]);

  // View options for dropdown
  viewOptions: { value: ViewType; label: string }[] = [
    { value: 'year', label: 'Year' },
    { value: 'month', label: 'Month' },
    { value: 'week', label: 'Week' },
    { value: 'day', label: 'Day' },
    { value: 'timeline', label: 'Timeline' },
  ];

  slotDurationOptions = [
    { value: 900, label: '15 min' },
    { value: 1800, label: '30 min' },
    { value: 3600, label: '1 hour' },
  ];

  fillData() {
    const now = new Date();
    const monday = this.getMonday(now);

    // Resources carry the colours (D12.6): most sample events specify NONE, so
    // they inherit their resource's colour through resolveEventColor — which is
    // also what makes the timeline's colour swatch visibly work. Deterministic
    // palette, reset so reloading the sample yields the same colours.
    this.paletteIndex = 0;
    this.resources.set([
      {
        id: generateGroupId(),
        title: 'Engineering',
        children: [
          {
            id: generateGroupId(),
            title: 'Frontend',
            children: [
              {
                id: generateResourceId(),
                title: 'Alice',
                color: this.nextPaletteColor(),
                events: [
                  this.createEvent('Sprint Planning', monday, 9, 10),
                  this.createEvent('Code Review', monday, 14, 15),
                ],
              },
              {
                id: generateResourceId(),
                title: 'Bob',
                color: this.nextPaletteColor(),
                events: [
                  this.createEvent('Sprint Planning', monday, 9, 10),
                  this.createEvent('Feature Development', this.addDays(monday, 1), 10, 16),
                ],
              },
            ],
          },
          {
            id: generateGroupId(),
            title: 'Backend',
            children: [
              {
                id: generateResourceId(),
                title: 'Charlie',
                color: this.nextPaletteColor(),
                events: [
                  this.createEvent('API Design', this.addDays(monday, 2), 9, 12),
                  // One explicit event colour on purpose: event.color OUTRANKS
                  // the resource colour (the documented precedence), and the
                  // sample should show the override once.
                  this.createEvent('Database Migration', this.addDays(monday, 3), 14, 17, '#6f42c1'),
                ],
              },
            ],
          },
        ],
      },
      {
        id: generateGroupId(),
        title: 'Design',
        children: [
          {
            id: generateResourceId(),
            title: 'Diana',
            color: this.nextPaletteColor(),
            events: [
              this.createEvent('Design Review', this.addDays(monday, 1), 11, 12),
              this.createEvent('Wireframing', this.addDays(monday, 4), 9, 17),
            ],
          },
        ],
      },
    ]);

    // Standalone events: no resource, so they take options.defaultEventColor —
    // except the Standups, which keep an explicit colour as the second half of
    // the override demonstration.
    this.events.set([
      this.createEvent('Team Standup', monday, 9, 9, '#e83e8c', 30),
      this.createEvent('Team Standup', this.addDays(monday, 1), 9, 9, '#e83e8c', 30),
      this.createEvent('Team Standup', this.addDays(monday, 2), 9, 9, '#e83e8c', 30),
      this.createEvent('Team Standup', this.addDays(monday, 3), 9, 9, '#e83e8c', 30),
      this.createEvent('Team Standup', this.addDays(monday, 4), 9, 9, '#e83e8c', 30),
      this.createEvent('Lunch & Learn', this.addDays(monday, 2), 12, 13),
      this.createEvent('All Hands Meeting', this.addDays(monday, 4), 15, 16),
    ]);

    this.log('Sample data loaded');
  }

  clearData() {
    this.resources.set([]);
    this.events.set([]);
    this.log('Data cleared');
  }

  // Event handlers
  onEventSelected(event: SchedulerEventSelectedEvent) {
    this.log(`Event selected: ${event.event.title}`);
  }

  onEventCreate(event: SchedulerEventCreateEvent) {
    // The WC emits a *request* with the selected range — this demo turns it
    // into a stored event with its own defaults (id, title, colour). A real
    // app could open a modal, gate on permissions, or skip creation entirely.
    const newEvent: SchedulerEvent = {
      id: generateEventId(),
      title: 'New Event',
      start: event.range.start,
      end: event.range.end,
      // No colour: a created event inherits its resource's colour (or the
      // default). Stamping '#3788d8' here made every creation look identical
      // and read as "resource colours don't work" (R18).
      ...(event.resourceId ? { resourceId: event.resourceId } : {}),
    };
    this.events.update((events) => [...events, newEvent]);
    this.log(`Event created: ${newEvent.title} (${this.formatDate(newEvent.start)} - ${this.formatDate(newEvent.end)})`);
    // Clear the WC's selection so subsequent gestures don't immediately
    // re-emit the same range.
    this.schedulerComponent()?.clearSelection();
  }

  onEventUpdate(event: SchedulerEventUpdateEvent) {
    // Update the event wherever it lives (flat list or resource tree)
    this.applyEventUpdate(event.event);
    this.log(`Event updated: ${event.event.title}`);
  }

  onEventDelete(event: SchedulerEventDeleteEvent) {
    // Both stores: the flat array AND the resource tree — sample events are
    // authored nested, and sweeping only the flat list silently ignored a
    // delete of any of them (the popover's delete button found this).
    const { id } = event.event;
    this.events.update((events) => events.filter((e) => e.id !== id));
    const walk = (item: Resource | ResourceGroup): Resource | ResourceGroup =>
      'children' in item
        ? { ...item, children: item.children.map(walk) }
        : { ...item, events: (item.events ?? []).filter((e) => e.id !== id) };
    this.resources.update((resources) => resources.map(walk));
    this.log(`Event deleted: ${event.event.title}`);
  }

  onDateClick(event: DateClickEvent) {
    this.log(`Date clicked: ${this.formatDate(event.date)}`);
  }

  onViewChange(view: ViewType) {
    // [(view)] / [(date)] already keep the models in sync — just log.
    this.log(`View changed to: ${view}`);
  }

  // --- App-owned editor card (the eventEditor:false escape hatch) ---------
  // Since phase 2 the WC ships its OWN editor (double-click / right-click /
  // F2), on by default — this card is what a consumer who disables it builds
  // instead: `event-dblclick` keeps firing either way, so the wiring below is
  // the whole recipe. The demo's "Event editor" select switches between the
  // two so both paths stay exercised.
  builtInEditor = signal(true);
  editingEvent = signal<SchedulerEvent | null>(null);
  editTitle = signal('');
  editStart = signal('');
  editEnd = signal('');

  onEventDblClick(event: SchedulerEventSelectedEvent) {
    if (!this.builtInEditor()) this.openEditor(event.event);
  }

  openEditor(event: SchedulerEvent) {
    this.editingEvent.set(event);
    this.editTitle.set(event.title);
    this.editStart.set(this.toLocalInputValue(event.start));
    this.editEnd.set(this.toLocalInputValue(event.end));
  }

  saveEditor() {
    const editing = this.editingEvent();
    const start = new Date(this.editStart());
    const end = new Date(this.editEnd());
    if (!editing || isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return;
    const updated: SchedulerEvent = { ...editing, title: this.editTitle(), start, end };
    this.applyEventUpdate(updated);
    this.log(`Event edited: ${updated.title} (${this.formatDate(start)} - ${this.formatDate(end)})`);
    this.editingEvent.set(null);
  }

  /**
   * Apply an update wherever the event lives, HONESTLY (B27): a cross-row move
   * changes `resourceId`, and an event authored nested under resource A must
   * not stay in A's array while claiming to belong to B. When a nested event
   * leaves its author row it moves to the flat `events` store, where
   * `resourceId` alone decides placement — the model's authoritative link.
   */
  private applyEventUpdate(updated: SchedulerEvent) {
    const wasFlat = this.events().some((e) => e.id === updated.id);
    if (wasFlat) {
      this.events.update((events) => events.map((e) => (e.id === updated.id ? updated : e)));
    }

    let leftItsResource = false;
    const walk = (item: Resource | ResourceGroup): Resource | ResourceGroup => {
      if ('children' in item) return { ...item, children: item.children.map(walk) };
      const nested = item.events ?? [];
      if (!nested.some((e) => e.id === updated.id)) return item;
      if (updated.resourceId === item.id) {
        return { ...item, events: nested.map((e) => (e.id === updated.id ? updated : e)) };
      }
      leftItsResource = true;
      return { ...item, events: nested.filter((e) => e.id !== updated.id) };
    };
    this.resources.update((resources) => resources.map(walk));
    if (leftItsResource && !wasFlat) {
      this.events.update((events) => [...events, updated]);
    }
  }

  closeEditor() {
    this.editingEvent.set(null);
  }

  /** Date → value for `<input type="datetime-local">` (local time, minutes). */
  private toLocalInputValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  // --- Permissions + popover behaviour demo ------------------------------
  // One select rather than five checkboxes: these are the three states a
  // consumer actually ships (read-only, the default, and "I manage my own
  // resource tree"), and the WC's own knobs are already granular underneath.
  // 'resource-admin' so the resource-tree affordances (R11: the per-group add
  // buttons, colour swatches, rename, the add bar) are visible on first visit
  // — with the WC's own defaults they are correctly absent, which repeatedly
  // read as "the buttons are missing". The select still offers the other modes.
  permissionMode = signal<'default' | 'readonly' | 'resource-admin'>('resource-admin');
  moreLinkBehavior = signal<'popover' | 'day'>('popover');
  // 'popover' matches the WC default since phase 2 (D12.2c) — leaving this at
  // 'none' would make the demo override the component's own default away.
  dayClickAction = signal<'none' | 'popover'>('popover');

  readonly permissionOptions: { value: 'default' | 'readonly' | 'resource-admin'; label: string }[] = [
    { value: 'default', label: 'Events editable (default)' },
    { value: 'readonly', label: 'Read-only' },
    { value: 'resource-admin', label: 'Events + resource tree editable' },
  ];

  /** Drives the wrapper's `[readonly]`, which outranks `options.permissions`. */
  readonly = computed(() => this.permissionMode() === 'readonly');

  // --- Resource-tree requests (timeline) ---------------------------------
  // Same contract as `eventCreate`: the WC asks, the consumer decides. It
  // never edits its own `[resources]`, so all four handlers below write the
  // signal themselves — including inventing the id and the initial colour,
  // which the WC deliberately does not do (it must stay a pure function of
  // its inputs).
  onResourceCreate(e: SchedulerResourceCreateEvent) {
    const resource: Resource = {
      id: generateResourceId(),
      title: 'New resource',
      color: this.nextPaletteColor(),
    };
    this.resources.update((resources) => this.insertInto(resources, e.parentId, resource));
    this.log(`Resource created${e.parentId ? ' in group ' + e.parentId : ''}`);
  }

  onGroupCreate(e: SchedulerResourceCreateEvent) {
    const group: ResourceGroup = { id: generateGroupId(), title: 'New group', children: [] };
    this.resources.update((resources) => this.insertInto(resources, e.parentId, group));
    this.log(`Group created${e.parentId ? ' in group ' + e.parentId : ''}`);
  }

  onResourceUpdate(e: SchedulerResourceUpdateEvent) {
    const { id } = e.resource;
    const apply = (item: Resource | ResourceGroup): Resource | ResourceGroup =>
      item.id === id
        ? { ...item, ...e.changes }
        : 'children' in item
          ? { ...item, children: item.children.map(apply) }
          : item;
    this.resources.update((resources) => resources.map(apply));
    this.log(`Resource updated: ${e.resource.title} → ${JSON.stringify(e.changes)}`);
  }

  /**
   * Remove the resource/group AND move its events to "(No resource)" (D12.7,
   * the user's chosen behaviour). Two sources to sweep: events authored nested
   * under the deleted subtree would vanish with it, and flat events pointing
   * at a removed id would dangle (the WC buckets those defensively, with a
   * warning — this handler is what makes the data agree with the rendering).
   * A consumer could equally delete the events or reassign them; it stays
   * their call.
   */
  onResourceDelete(e: SchedulerResourceDeleteEvent) {
    const { id } = e.resource;
    const removedIds = new Set(this.collectResourceIds(e.resource));

    const nestedEvents = this.collectNestedEvents(e.resource);
    const prune = (items: (Resource | ResourceGroup)[]): (Resource | ResourceGroup)[] =>
      items
        .filter((item) => item.id !== id)
        .map((item) => ('children' in item ? { ...item, children: prune(item.children) } : item));
    this.resources.update(prune);

    const unassign = (ev: SchedulerEvent): SchedulerEvent => {
      const copy = { ...ev };
      delete copy.resourceId;
      return copy;
    };
    this.events.update((events) => [
      ...events.map((ev) =>
        ev.resourceId && removedIds.has(ev.resourceId) ? unassign(ev) : ev,
      ),
      ...nestedEvents.map(unassign),
    ]);
    this.log(`Resource removed: ${e.resource.title} — its events moved to "(No resource)"`);
  }

  /** The node's own id plus every descendant's (a group takes its subtree). */
  private collectResourceIds(item: Resource | ResourceGroup): string[] {
    return 'children' in item
      ? [item.id, ...item.children.flatMap((child) => this.collectResourceIds(child))]
      : [item.id];
  }

  private collectNestedEvents(item: Resource | ResourceGroup): SchedulerEvent[] {
    return 'children' in item
      ? item.children.flatMap((child) => this.collectNestedEvents(child))
      : item.events ?? [];
  }

  /** Insert at root when `parentId` is absent, else into that group. */
  private insertInto(
    items: (Resource | ResourceGroup)[],
    parentId: string | undefined,
    added: Resource | ResourceGroup,
  ): (Resource | ResourceGroup)[] {
    if (!parentId) return [...items, added];
    return items.map((item) =>
      'children' in item
        ? item.id === parentId
          ? { ...item, children: [...item.children, added] }
          : { ...item, children: this.insertInto(item.children, parentId, added) }
        : item,
    );
  }

  /**
   * Deterministic colour rotation. A consumer has to supply the initial colour
   * because the WC cannot invent one without becoming stateful — this is the
   * "random colour on creation" half of the request, made repeatable.
   */
  private paletteIndex = 0;
  private nextPaletteColor(): string {
    const palette = ['#3788d8', '#28a745', '#ffc107', '#dc3545', '#6f42c1', '#fd7e14', '#17a2b8'];
    return palette[this.paletteIndex++ % palette.length];
  }

  // Helper methods
  private createEvent(
    title: string,
    day: Date,
    startHour: number,
    endHour: number,
    color?: string,
    durationMinutes?: number
  ): SchedulerEvent {
    const start = new Date(day);
    start.setHours(startHour, 0, 0, 0);

    const end = new Date(day);
    if (durationMinutes) {
      end.setHours(startHour, durationMinutes, 0, 0);
    } else {
      end.setHours(endHour, 0, 0, 0);
    }

    return {
      id: generateEventId(),
      title,
      start,
      end,
      // Absent when not given: an explicit event colour outranks the resource
      // colour, so stamping one here would defeat resource colouring entirely.
      ...(color ? { color } : {}),
    };
  }

  private getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private formatDate(date: Date): string {
    // Follows the demo's own locale switch, so the log agrees with the grid.
    return date.toLocaleString(this.locale(), {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private log(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    this.eventLog.update((log) => [`[${timestamp}] ${message}`, ...log.slice(0, 9)]);
  }

  protected readonly snippetBasicHtml = dedent`
    <bs-scheduler
      [view]="view()"
      [date]="date()"
      [events]="events()"
      [options]="options()"
      (eventCreate)="onEventCreate($event)"
      (eventUpdate)="onEventUpdate($event)"
      (eventDelete)="onEventDelete($event)">
    </bs-scheduler>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, computed, signal } from '@angular/core';
    import {
      BsSchedulerComponent,
      SchedulerEventCreateEvent,
      SchedulerEventUpdateEvent,
      SchedulerEventDeleteEvent,
    } from '@mintplayer/ng-bootstrap/scheduler';
    import {
      ViewType,
      SchedulerEvent,
      SchedulerOptions,
      generateEventId,
    } from '@mintplayer/web-components/scheduler-core';

    @Component({
      selector: 'my-calendar',
      templateUrl: './my-calendar.component.html',
      imports: [BsSchedulerComponent],
    })
    export class MyCalendarComponent {
      view = signal<ViewType>('week');
      date = signal<Date>(new Date());
      events = signal<SchedulerEvent[]>([]);

      options = computed<Partial<SchedulerOptions>>(() => ({
        slotDuration: 1800,        // 30 minutes
        timeFormat: '24h',
        firstDayOfWeek: 1,         // Monday
        nowIndicator: true,
      }));

      // The WC emits a *request* with the selected range. The consumer
      // decides whether to materialise an event (or open a dialog first).
      onEventCreate(e: SchedulerEventCreateEvent): void {
        this.events.update((events) => [...events, {
          id: generateEventId(),
          title: 'New Event',
          start: e.range.start,
          end: e.range.end,
          color: '#3788d8',
        }]);
      }

      onEventUpdate(e: SchedulerEventUpdateEvent): void {
        this.events.update((events) =>
          events.map((ev) => (ev.id === e.event.id ? e.event : ev)));
      }

      onEventDelete(e: SchedulerEventDeleteEvent): void {
        this.events.update((events) => events.filter((ev) => ev.id !== e.event.id));
      }
    }
  `;

  protected readonly snippetControlledSelectionTs = dedent`
    // Per PRD scheduler-controlled-selection the WC no longer auto-clears
    // its selection after (eventCreate). The consumer commits, then calls
    // clearSelection() so subsequent gestures don't re-emit the same range.
    private scheduler = viewChild<BsSchedulerComponent>(BsSchedulerComponent);

    onEventCreate(e: SchedulerEventCreateEvent): void {
      this.api.createEvent(e.range).then((created) => {
        this.events.update((events) => [...events, created]);
        this.scheduler()?.clearSelection();
      });
    }
  `;
}
