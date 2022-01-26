import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, QueryList, ViewChildren } from '@angular/core';
import { BehaviorSubject, combineLatest, filter, map, Observable, Subject, take, takeUntil } from 'rxjs';
import { BsCalendarMonthService } from '../../../../services/calendar-month/calendar-month.service';
import { EDragOperation } from '../../enums/drag-operation';
import { DragOperation } from '../../interfaces/drag-operation';
import { PreviewEvent } from '../../interfaces/preview-event';
import { SchedulerEvent } from '../../interfaces/scheduler-event';
import { SchedulerEventPart } from '../../interfaces/scheduler-event-part';
import { SchedulerEventWithParts } from '../../interfaces/scheduler-event-with-parts';
import { TimeSlot } from '../../interfaces/time-slot';
import { BsTimelineService } from '../../services/timeline/timeline.service';

@Component({
  selector: 'bs-scheduler',
  templateUrl: './scheduler.component.html',
  styleUrls: ['./scheduler.component.scss'],
})
export class BsSchedulerComponent implements OnDestroy {
  constructor(private calendarMonthService: BsCalendarMonthService, private timelineService: BsTimelineService) {
    const monday = this.calendarMonthService.getMondayBefore(new Date());
    this.currentWeek$ = new BehaviorSubject<Date>(monday);

    this.daysOfWeek$ = this.currentWeek$.pipe(
      map((weekMonday) => {
        weekMonday.setHours(0);
        weekMonday.setMinutes(0);
        weekMonday.setSeconds(0);
        weekMonday.setMilliseconds(0);
        return Array.from(Array(7).keys()).map((x) => this.addDays(weekMonday, x));
      })
    );

    this.daysOfWeekWithTimestamps$ = this.daysOfWeek$
      .pipe(map((daysOfWeek) => {
        return { start: daysOfWeek[0].getTime(), end: daysOfWeek[daysOfWeek.length - 1].getTime() + 24 * 60 * 60 * 1000 };
      }));

    this.eventParts$ = this.events$.pipe(
      map((events) =>  events.map((ev) => this.timelineService.splitInParts(ev)))
    );

    this.eventPartsForThisWeek$ = combineLatest([
      this.daysOfWeekWithTimestamps$,
      this.eventParts$
        .pipe(map(eventParts => eventParts.map(evp => evp.parts)))
        .pipe(map(jaggedParts => {
          return jaggedParts.reduce((flat, toFlatten) => flat.concat(toFlatten), []);
        }))
      ])
      .pipe(map(([startAndEnd, eventParts]) => {
        return eventParts.filter(eventPart => {
          return !((eventPart.end.getTime() <= startAndEnd.start) || (eventPart.start.getTime() >= startAndEnd.end));
        });
      }));

    this.previewEventParts$ = this.previewEvent$.pipe(
      map((event) => {
        if (event) {
          return this.timelineService.splitInParts(event)
        } else {
          return null;
        }
      })
    );
    this.previewEventPartsForThisWeek$ = combineLatest([this.daysOfWeekWithTimestamps$, this.previewEventParts$])
      .pipe(map(([startAndEnd, previewEventParts]) => {
        if (previewEventParts) {
          return previewEventParts.parts.filter(eventPart => {
            return !((eventPart.end.getTime() <= startAndEnd.start) || (eventPart.start.getTime() >= startAndEnd.end));
          });
        } else {
          return [];
        }
      }));

    this.timelinedEventPartsForThisWeek$ = this.eventPartsForThisWeek$
      .pipe(map(eventParts => {
        // We'll only use the events for this week
        const events = eventParts.map(ep => ep.event)
          .filter((e, i, list) => list.indexOf(e) === i)
          .filter((e) => !!e)
          .map((e) => <SchedulerEvent>e);
        const timeline = this.timelineService.getTimeline(events);

        const result = timeline.map(track => {
          return track.events.map(ev => {
            return { event: ev, index: track.index };
          });
        })
        .reduce((flat, toFlatten) => flat.concat(toFlatten), [])
        .map((evi) => eventParts.filter(p => p.event === evi.event).map(p => {
            return { part: p, index: evi.index };
          })
        )
        .reduce((flat, toFlatten) => flat.concat(toFlatten), []);

        return {
          total: timeline.length,
          parts: result
        };
      }))

    this.timeSlots$ = combineLatest([this.daysOfWeek$, this.timeSlotDuration$])
      .pipe(map(([daysOfWeek, duration]) => {
        const timeSlotsPerDay = Math.floor((60 * 60 * 24) / duration);

        return Array.from(Array(timeSlotsPerDay).keys()).map((index) => {
          const timeSlotStart = new Date(daysOfWeek[0]);
          timeSlotStart.setSeconds(timeSlotStart.getSeconds() + index * duration);
          const timeSlotEnd = new Date(timeSlotStart);
          timeSlotEnd.setSeconds(timeSlotEnd.getSeconds() + duration);

          return daysOfWeek.map((day) => {
            const start = new Date(day);
            start.setHours(timeSlotStart.getHours());
            start.setMinutes(timeSlotStart.getMinutes());
            start.setSeconds(timeSlotStart.getSeconds());
            start.setMilliseconds(timeSlotStart.getMilliseconds());

            const end = new Date(day);
            end.setHours(timeSlotEnd.getHours());
            end.setMinutes(timeSlotEnd.getMinutes());
            end.setSeconds(timeSlotEnd.getSeconds());
            end.setMilliseconds(timeSlotEnd.getMilliseconds());

            return <TimeSlot>{ start, end };
          });
        });

      }));
    
    this.unitHeight$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((unitHeight) => {
        this.unitHeightChange.emit(unitHeight);
      })
  }

  events$ = new BehaviorSubject<SchedulerEvent[]>([]);
  eventParts$: Observable<SchedulerEventWithParts[]>;
  eventPartsForThisWeek$: Observable<SchedulerEventPart[]>;
  timelinedEventPartsForThisWeek$: Observable<{ total: number, parts: { part: SchedulerEventPart, index: number}[] }>;
  
  previewEvent$ = new BehaviorSubject<PreviewEvent | null>(null);
  previewEventParts$: Observable<SchedulerEventWithParts | null>;
  previewEventPartsForThisWeek$: Observable<SchedulerEventPart[]>;
  
  currentWeek$: BehaviorSubject<Date>;
  daysOfWeek$: Observable<Date[]>;
  daysOfWeekWithTimestamps$: Observable<{start: number, end: number}>;
  timeSlotDuration$ = new BehaviorSubject<number>(1800);
  timeSlots$: Observable<TimeSlot[][]>;
  mouseState$ = new BehaviorSubject<boolean>(false);
  hoveredTimeSlot$ = new BehaviorSubject<TimeSlot | null>(null);
  destroyed$ = new Subject();

  @ViewChildren('slot') timeSlotElements!: QueryList<ElementRef<HTMLDivElement>>;

  //#region UnitHeight
  unitHeight$ = new BehaviorSubject<number>(40);
  @Output() public unitHeightChange = new EventEmitter<number>();
  public get unitHeight() {
    return this.unitHeight$.value;
  }
  @Input() public set unitHeight(value: number) {
    this.unitHeight$.next(value);
  }
  //#endregion

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  onPreviousWeek() {
    this.currentWeek$
      .pipe(map((w) => this.addDays(w, -7)), take(1))
      .subscribe((w) => this.currentWeek$.next(w));
  }

  onNextWeek() {
    this.currentWeek$
      .pipe(map((w) => this.addDays(w, 7)), take(1))
      .subscribe((w) => this.currentWeek$.next(w));
  }

  operation: DragOperation | null = null;
  dragStartTimeslot: TimeSlot | null = null;
  onCreateEvent(ev: MouseEvent, slot: TimeSlot) {
    ev.preventDefault();
    this.mouseState$.next(true);
    this.dragStartTimeslot = slot;
    this.operation = {
      operation: EDragOperation.createEvent,
      event: {
        start: slot.start,
        end: slot.end,
        color: '#5AC8FA',
        description: 'Test event',
      }
    };
    this.previewEvent$.next({ start: slot.start, end: slot.end });

    // this.events$.next([...this.events$.value, this.operation.event]);
  }

  onStartDragEvent(eventPart: SchedulerEventPart, ev: MouseEvent) {
    ev.preventDefault();
    this.hoveredTimeSlot$.pipe(take(1)).subscribe((hoveredTimeSlot) => {
      if (eventPart.event) {
        this.dragStartTimeslot = hoveredTimeSlot;
        this.operation = {
          operation: EDragOperation.moveEvent,
          event: eventPart.event,
        };
        this.previewEvent$.next({ start: eventPart.event.start, end: eventPart.event.end });
      }
    });
  }

  //#region hoveredTimeslot$
  private getHoveredTimeslot(ev: MouseEvent, timeSlots: TimeSlot[][]) {
    const hoveredSlots = this.timeSlotElements.filter((el) => {
      const rct = el.nativeElement.getBoundingClientRect();
      if (rct.left <= ev.x && ev.x <= rct.right && rct.top <= ev.y && ev.y <= rct.bottom) {
        return true;
      } else {
        return false;
      }
    });

    if (!hoveredSlots || hoveredSlots.length === 0) {
      return null;
    }

    const slotElement = hoveredSlots[0].nativeElement;

    const strRow = slotElement.getAttribute('data-row');
    if (!strRow) {
      return null;
    }
    const row = parseInt(strRow);

    const strColumn = slotElement.getAttribute('data-column');
    if (!strColumn) {
      return null;
    }
    const column = parseInt(strColumn);

    const slot = timeSlots[row][column];
    return slot;
  }

  @HostListener('document:mousemove', ['$event'])
  onMousemove(ev: MouseEvent) {
    this.timeSlots$.pipe(take(1)).subscribe((timeSlots) => {
      const hovered = this.getHoveredTimeslot(ev, timeSlots);
      this.hoveredTimeSlot$.next(hovered);

      if (this.operation) {
        switch (this.operation.operation) {
          case EDragOperation.createEvent: {
            if (this.operation.event && this.dragStartTimeslot && hovered && (this.operation.event.end.getTime() != hovered.end.getTime())) {
              if (this.dragStartTimeslot.start.getTime() === hovered.start.getTime()) {
                // 1 slot
              } else if (this.dragStartTimeslot.start.getTime() < hovered.start.getTime()) {
                // Drag down
                // this.operation.event.start = this.dragStartTimeslot.start;
                // this.operation.event.end = hovered.end;
                // this.events$.next(this.events$.value);
                this.previewEvent$
                  .pipe(filter((ev) => !!ev && !!this.dragStartTimeslot))
                  .pipe(map((ev) => {
                    if (ev && this.dragStartTimeslot) {
                      ev.start = this.dragStartTimeslot.start;
                      ev.end = hovered.end;
                    }
                    return ev;
                  }))
                  .pipe(take(1))
                  .subscribe((ev) => this.previewEvent$.next(ev));
              } else if (this.dragStartTimeslot.start.getTime() > hovered.start.getTime()) {
                // Drag up
                // this.operation.event.start = hovered.start;
                // this.operation.event.end = this.dragStartTimeslot.end;
                // this.events$.next(this.events$.value);
                this.previewEvent$
                  .pipe(filter((ev) => !!ev && !!this.dragStartTimeslot))
                  .pipe(map((ev) => {
                    if (ev && this.dragStartTimeslot) {
                      ev.start = hovered.start;
                      ev.end = this.dragStartTimeslot.end;
                    }
                    return ev;
                  }))
                  .pipe(take(1))
                  .subscribe((ev) => this.previewEvent$.next(ev));
              }
            }
          } break;
          case EDragOperation.moveEvent: {
            if (hovered && this.dragStartTimeslot) {
              // this.operation.event.start.setTime(this.operation.event.start.getTime() + hovered.start.getTime() - this.dragStartTimeslot.start.getTime());
              // this.operation.event.end.setTime(this.operation.event.end.getTime() + hovered.start.getTime() - this.dragStartTimeslot.start.getTime());
              // this.dragStartTimeslot = hovered;
              // // this.events$.next(this.events$.value);

              this.previewEvent$
                .pipe(filter((ev) => !!ev && !!this.dragStartTimeslot))
                .pipe(map((ev) => {
                  if (ev && this.dragStartTimeslot) {
                    ev.start.setTime(ev.start.getTime() + hovered.start.getTime() - this.dragStartTimeslot.start.getTime());
                    ev.end.setTime(ev.end.getTime() + hovered.start.getTime() - this.dragStartTimeslot.start.getTime());
                    this.dragStartTimeslot = hovered;
                  }
                  return ev;
                }))
                .pipe(take(1))
                .subscribe((ev) => this.previewEvent$.next(ev));
            }
          } break;
        }
      }

    });
  }
  //#endregion

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(ev: MouseEvent) {
    if (this.operation) {
      switch (this.operation.operation) {
        case EDragOperation.createEvent: {
          combineLatest([this.previewEvent$])
            .pipe(take(1))
            .subscribe(([previewEvent]) => {
              if (previewEvent) {
                this.operation = null;
                this.dragStartTimeslot = null;
                this.events$.next([...this.events$.value, {
                  start: previewEvent.start,
                  end: previewEvent.end,
                  color: '#F00',
                  description: 'New event'
                }]);
                this.previewEvent$.next(null);
              }
            });
        } break;
        case EDragOperation.moveEvent: {
          this.previewEvent$
            .pipe(filter((ev) => !!ev))
            .pipe(take(1))
            .subscribe((previewEvent) => {
              if (this.operation && this.operation.event && previewEvent) {
                this.operation.event.start = previewEvent.start;
                this.operation.event.end = previewEvent.end;
                this.operation = null;
                this.dragStartTimeslot = null;
                this.events$.next(this.events$.value);
                this.previewEvent$.next(null);
              }
            });
        } break;
      }
    }
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
