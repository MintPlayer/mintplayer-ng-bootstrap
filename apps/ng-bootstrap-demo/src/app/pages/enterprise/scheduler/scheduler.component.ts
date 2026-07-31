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
  DateClickEvent,
} from '@mintplayer/ng-bootstrap/scheduler';
import {
  ViewType,
  SchedulerEvent,
  Resource,
  ResourceGroup,
  SchedulerOptions,
  generateEventId,
  generateResourceId,
  generateGroupId,
  dateService,
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
  timeFormat = signal<'12h' | '24h'>(dateService.detectTimeFormat());
  firstDayOfWeek = signal<0 | 1>(1); // Monday

  // Options computed from signals
  options = computed<Partial<SchedulerOptions>>(() => ({
    slotDuration: this.slotDuration(),
    timeFormat: this.timeFormat(),
    firstDayOfWeek: this.firstDayOfWeek(),
    nowIndicator: true,
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
                events: [
                  this.createEvent('Sprint Planning', monday, 9, 10, '#3788d8'),
                  this.createEvent('Code Review', monday, 14, 15, '#28a745'),
                ],
              },
              {
                id: generateResourceId(),
                title: 'Bob',
                events: [
                  this.createEvent('Sprint Planning', monday, 9, 10, '#3788d8'),
                  this.createEvent('Feature Development', this.addDays(monday, 1), 10, 16, '#ffc107'),
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
                events: [
                  this.createEvent('API Design', this.addDays(monday, 2), 9, 12, '#dc3545'),
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
            events: [
              this.createEvent('Design Review', this.addDays(monday, 1), 11, 12, '#fd7e14'),
              this.createEvent('Wireframing', this.addDays(monday, 4), 9, 17, '#17a2b8'),
            ],
          },
        ],
      },
    ]);

    // Also populate standalone events
    this.events.set([
      this.createEvent('Team Standup', monday, 9, 9, '#e83e8c', 30),
      this.createEvent('Team Standup', this.addDays(monday, 1), 9, 9, '#e83e8c', 30),
      this.createEvent('Team Standup', this.addDays(monday, 2), 9, 9, '#e83e8c', 30),
      this.createEvent('Team Standup', this.addDays(monday, 3), 9, 9, '#e83e8c', 30),
      this.createEvent('Team Standup', this.addDays(monday, 4), 9, 9, '#e83e8c', 30),
      this.createEvent('Lunch & Learn', this.addDays(monday, 2), 12, 13, '#20c997'),
      this.createEvent('All Hands Meeting', this.addDays(monday, 4), 15, 16, '#6c757d'),
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
      color: '#3788d8',
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
    // Remove the event from our events array
    this.events.update((events) => events.filter((e) => e.id !== event.event.id));
    this.log(`Event deleted: ${event.event.title}`);
  }

  onDateClick(event: DateClickEvent) {
    this.log(`Date clicked: ${this.formatDate(event.date)}`);
  }

  onViewChange(view: ViewType) {
    // [(view)] / [(date)] already keep the models in sync — just log.
    this.log(`View changed to: ${view}`);
  }

  // --- Event editor (double-click an event) -------------------------------
  // The form is the single-pointer NON-DRAG path to change an event's times
  // (WCAG 2.5.7 Dragging Movements): every resize possible by drag is also
  // possible here. The WC deliberately doesn't own an editor — consumers do.
  editingEvent = signal<SchedulerEvent | null>(null);
  editTitle = signal('');
  editStart = signal('');
  editEnd = signal('');

  onEventDblClick(event: SchedulerEventSelectedEvent) {
    this.openEditor(event.event);
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

  /** Replace the event by id wherever it lives — the flat list AND the
   *  resource tree (timeline events belong to resources, not `events`). */
  private applyEventUpdate(updated: SchedulerEvent) {
    this.events.update((events) => events.map((e) => (e.id === updated.id ? updated : e)));
    const walk = (item: Resource | ResourceGroup): Resource | ResourceGroup =>
      'children' in item
        ? { ...item, children: item.children.map(walk) }
        : { ...item, events: (item.events ?? []).map((e) => (e.id === updated.id ? updated : e)) };
    this.resources.update((resources) => resources.map(walk));
  }

  closeEditor() {
    this.editingEvent.set(null);
  }

  /** Date → value for `<input type="datetime-local">` (local time, minutes). */
  private toLocalInputValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  // Helper methods
  private createEvent(
    title: string,
    day: Date,
    startHour: number,
    endHour: number,
    color: string,
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
      color,
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
    return date.toLocaleString('en-US', {
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
