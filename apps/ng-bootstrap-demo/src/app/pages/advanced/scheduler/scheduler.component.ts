import { Component, model, signal, computed, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCardComponent, BsCardHeaderComponent } from '@mintplayer/ng-bootstrap/card';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import {
  BsSchedulerComponent,
  SchedulerEventClickEvent,
  SchedulerEventCreateEvent,
  SchedulerEventUpdateEvent,
  SchedulerEventDeleteEvent,
  DateClickEvent,
  ViewChangeEvent,
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
} from '@mintplayer/scheduler-core';

@Component({
  selector: 'demo-scheduler',
  templateUrl: './scheduler.component.html',
  styleUrls: ['./scheduler.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    BsCardComponent,
    BsCardHeaderComponent,
    BsFormComponent,
    BsInputGroupComponent,
    BsButtonTypeDirective,
    BsSelectComponent,
    BsSelectOption,
    BsSchedulerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchedulerComponent {
  colors = Color;

  // View state
  view = signal<ViewType>('week');
  date = signal<Date>(new Date());

  // Configuration
  slotDuration = signal<number>(1800); // 30 minutes
  timeFormat = signal<'12h' | '24h'>(dateService.detectTimeFormat());
  firstDayOfWeek = signal<0 | 1>(1); // Monday

  // Options computed from signals
  options = computed<Partial<SchedulerOptions>>(() => ({
    slotDuration: this.slotDuration(),
    timeFormat: this.timeFormat(),
    firstDayOfWeek: this.firstDayOfWeek(),
    editable: true,
    selectable: true,
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
  onEventClick(event: SchedulerEventClickEvent) {
    this.log(`Event clicked: ${event.event.title}`);
  }

  onEventCreate(event: SchedulerEventCreateEvent) {
    // Add the newly created event to our events array
    this.events.update((events) => [...events, event.event]);
    this.log(`Event created: ${event.event.title} (${this.formatDate(event.event.start)} - ${this.formatDate(event.event.end)})`);
  }

  onEventUpdate(event: SchedulerEventUpdateEvent) {
    // Update the event in our events array
    this.events.update((events) =>
      events.map((e) => (e.id === event.event.id ? event.event : e))
    );
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

  onViewChange(event: ViewChangeEvent) {
    this.view.set(event.view);
    this.date.set(event.date);
    this.log(`View changed to: ${event.view}`);
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
}
