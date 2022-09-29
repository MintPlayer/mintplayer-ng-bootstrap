import { Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, QueryList, ViewChildren } from '@angular/core';
import { BehaviorSubject, combineLatest, filter, map, Observable, Subject, take, takeUntil } from 'rxjs';
import { ESchedulerMode } from '../../enums/scheduler-mode';
import { BsCalendarMonthService } from '../../../../services/calendar-month/calendar-month.service';
import { EDragOperation } from '../../enums/drag-operation';
import { DragOperation } from '../../interfaces/drag-operation';
import { PreviewEvent } from '../../interfaces/preview-event';
import { SchedulerEvent } from '../../interfaces/scheduler-event';
import { SchedulerEventPart } from '../../interfaces/scheduler-event-part';
import { SchedulerEventWithParts } from '../../interfaces/scheduler-event-with-parts';
import { TimeSlot } from '../../interfaces/time-slot';
import { BsTimelineService } from '../../services/timeline/timeline.service';
import { ResourceGroup } from '../../interfaces/resource-group';
import { Resource } from '../../interfaces';
import { SchedulerStampWithSlots } from '../../interfaces/scheduler-stamp-with-slots';
import { WeekOptions } from '../../interfaces/week-options';
import { TimelineOptions } from '../../interfaces/timeline-options';

@Component({
  selector: 'bs-scheduler',
  templateUrl: './scheduler.component.html',
  styleUrls: ['./scheduler.component.scss'],
})
export class BsSchedulerComponent implements OnDestroy {
  constructor(private calendarMonthService: BsCalendarMonthService, private timelineService: BsTimelineService) {
    const monday = this.calendarMonthService.getMondayBefore(new Date());
    this.currentWeekOrMonth$ = new BehaviorSubject<Date>(monday);

    this.shownDays$ = combineLatest([this.currentWeekOrMonth$, this.mode$])
      .pipe(map(([currentDay, mode]) => {
        currentDay.setHours(0);
        currentDay.setMinutes(0);
        currentDay.setSeconds(0);
        currentDay.setMilliseconds(0);
        switch (mode) {
          case ESchedulerMode.week: {
            return Array.from(Array(7).keys()).map((x) => this.addDays(currentDay, x));
          }
          case ESchedulerMode.timeline: {
            const firstDay = new Date(currentDay.getFullYear(), currentDay.getMonth(), 1);
            const daysOfMonth = new Date(currentDay.getFullYear(), currentDay.getMonth() + 1, 0).getDate();
            return Array.from(Array(daysOfMonth).keys()).map((x) => this.addDays(firstDay, x));
          }
        }
      })
    );

    this.daysOfWeekWithTimestamps$ = this.shownDays$
      .pipe(map((shownDays) => ({ start: shownDays[0].getTime(), end: shownDays[shownDays.length - 1].getTime() + 24 * 60 * 60 * 1000 })));
    
    this.events$ = this.resources$
      .pipe(map((resourcesOrGroups) => resourcesOrGroups.map(resOrGroup => this.getResourcesForGroup(resOrGroup))))
      .pipe(map(jaggedResources => jaggedResources.reduce((flat, toFlatten) => flat.concat(toFlatten), [])))
      .pipe(map(resources => resources.map(res => res.events)))
      .pipe(map(jaggedEvents => jaggedEvents.reduce((flat, toFlatten) => flat.concat(toFlatten), [])));

      // groups.reduce((flat, toFlatten) => flat.concat(toFlatten.children), [])
    this.eventParts$ = this.events$.pipe(
      map((events) =>  events.map((ev) => this.timelineService.splitInParts(ev)))
    );

    this.eventPartsForThisWeek$ = combineLatest([
      this.daysOfWeekWithTimestamps$,
      this.eventParts$
        .pipe(map(eventParts => eventParts.map(evp => evp.parts)))
        .pipe(map(jaggedParts =>  jaggedParts.reduce((flat, toFlatten) => flat.concat(toFlatten), [])))
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

        const result = timeline.map(track => track.events.map(ev => ({ event: ev, index: track.index })))
          .reduce((flat, toFlatten) => flat.concat(toFlatten), [])
          .map((evi) => eventParts.filter(p => p.event === evi.event).map(p => ({ part: p, index: evi.index })))
          .reduce((flat, toFlatten) => flat.concat(toFlatten), []);

        return {
          total: timeline.length,
          parts: result
        };
      }));

    combineLatest([this.mode$, this.shownDays$, this.timeSlotDuration$])
      .pipe(filter(([mode, shownDays, duration]) => mode !== null))
      .pipe(map(([mode, shownDays, duration]) => {
        switch (mode) {
          case ESchedulerMode.week: {
            const timeSlotsPerDay = Math.floor((60 * 60 * 24) / duration);
            return Array.from(Array(timeSlotsPerDay).keys()).map((index) => {
              const timeslotForMonday = this.createTimeslot(shownDays[0], index, duration);

              return <SchedulerStampWithSlots>{
                slots: shownDays.map((day) => {
                  const start = new Date(day);
                  start.setHours(timeslotForMonday.start.getHours());
                  start.setMinutes(timeslotForMonday.start.getMinutes());
                  start.setSeconds(timeslotForMonday.start.getSeconds());
                  start.setMilliseconds(timeslotForMonday.start.getMilliseconds());
      
                  const end = new Date(day);
                  end.setHours(timeslotForMonday.end.getHours());
                  end.setMinutes(timeslotForMonday.end.getMinutes());
                  end.setSeconds(timeslotForMonday.end.getSeconds());
                  end.setMilliseconds(timeslotForMonday.end.getMilliseconds());
                  end.setDate(end.getDate() + timeslotForMonday.end.getDate() - timeslotForMonday.start.getDate());
      
                  return <TimeSlot>{ start, end };
                }),
                stamp: timeslotForMonday.start
              };
            });
          }
          case ESchedulerMode.timeline: {
            const totalTimeslots = (24 * 60 * 60) / duration;
            return shownDays.map((day) => {
              return <SchedulerStampWithSlots>{
                slots: Array.from(Array(totalTimeslots).keys())
                  .map((index) => {
                    return this.createTimeslot(day, index, duration);
                  }),
                stamp: day
              } 
            });
          }
          default: {
            throw 'Unknown value for Mode: ' + mode;
          }
        }
      }))
      .subscribe((timeslots) => {
        // For performance reasons, we're not using an observable here, but persist the timeslots in a BehaviorSubject.
        this.timeSlots$.next(timeslots);
      });
    
      this.weekOptions$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((weekOptions) => {
        this.weekOptionsChange.emit(weekOptions);
      });
    this.timelineOptions$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((timelineOptions) => {
        this.timelineOptionsChange.emit(timelineOptions);
      });

    // combineLatest([this.mode$, this.scale$])
    //   .pipe(filter(([mode, scale]) => mode === ESchedulerMode.timeline))

  }

  resources$ = new BehaviorSubject<(Resource | ResourceGroup)[]>([]);
  events$: Observable<SchedulerEvent[]>;
  eventParts$: Observable<SchedulerEventWithParts[]>;
  eventPartsForThisWeek$: Observable<SchedulerEventPart[]>;
  timelinedEventPartsForThisWeek$: Observable<{ total: number, parts: { part: SchedulerEventPart, index: number}[] }>;
  weekOptions$ = new BehaviorSubject<WeekOptions>({ unitHeight: 30 });
  timelineOptions$ = new BehaviorSubject<TimelineOptions>({ unitWidth: 50 });
  
  previewEvent$ = new BehaviorSubject<PreviewEvent | null>(null);
  previewEventParts$: Observable<SchedulerEventWithParts | null>;
  previewEventPartsForThisWeek$: Observable<SchedulerEventPart[]>;
  
  currentWeekOrMonth$: BehaviorSubject<Date>;
  shownDays$: Observable<Date[]>;
  daysOfWeekWithTimestamps$: Observable<{start: number, end: number}>;
  timeSlotDuration$ = new BehaviorSubject<number>(1800);
  timeSlots$ = new BehaviorSubject<SchedulerStampWithSlots[]>([]);
  mouseState$ = new BehaviorSubject<boolean>(false);
  hoveredTimeSlot$ = new BehaviorSubject<TimeSlot | null>(null);
  hoveredEvent$ = new BehaviorSubject<SchedulerEvent | null>(null);
  destroyed$ = new Subject();

  @ViewChildren('slot') timeSlotElements!: QueryList<ElementRef<HTMLDivElement>>;

  createTimeslot(date: Date, index: number, duration: number) {
    const timeSlotStart = new Date(date);
    timeSlotStart.setTime(+timeSlotStart.getTime() + index * duration * 1000);
    const timeSlotEnd = new Date(timeSlotStart);
    timeSlotEnd.setTime(+timeSlotEnd.getTime() + duration * 1000);

    return <TimeSlot>{ start: timeSlotStart, end: timeSlotEnd };
  }

  getResourcesForGroup(resourceOrGroup: Resource | ResourceGroup) : Resource[] {
    if ('children' in resourceOrGroup) {
      return resourceOrGroup.children
        .map((child) => this.getResourcesForGroup(child))
        .reduce((flat, toFlatten) => flat.concat(toFlatten), []);
    } else {
      return [resourceOrGroup];
    }
  }

  //#region Mode
  modes = ESchedulerMode;
  mode$ = new BehaviorSubject<ESchedulerMode>(ESchedulerMode.week);
  @Output() public modeChange = new EventEmitter<ESchedulerMode>();
  public get mode() {
    return this.mode$.value;
  }
  @Input() public set mode(value: ESchedulerMode) {
    this.mode$.next(value);
  }
  //#endregion
  // //#region Scale
  // scale$ = new BehaviorSubject<SchedulerScale>(availableScales[4]);
  // @Output() public scaleChange = new EventEmitter<SchedulerScale>();
  // public get scale() {
  //   return this.scale$.value;
  // }
  // @Input() public set scale(value: SchedulerScale) {
  //   this.scale$.next(value);
  // }
  // //#endregion
  //#region WeekOptions
  @Output() public weekOptionsChange = new EventEmitter<WeekOptions>();
  public get weekOptions() {
    return this.weekOptions$.value;
  }
  @Input() public set weekOptions(value: WeekOptions) {
    this.weekOptions$.next(value);
  }
  //#endregion
  //#region TimelineOptions
  @Output() public timelineOptionsChange = new EventEmitter<TimelineOptions>();
  public get timelineOptions() {
    return this.timelineOptions$.value;
  }
  @Input() public set timelineOptions(value: TimelineOptions) {
    this.timelineOptions$.next(value);
  }
  //#endregion
  //#region maxInnerHeight
  @Input() public maxInnerHeight: number | null = null;
  //#endregion
  //#region Resources
  public get resources() {
    return this.resources$.value;
  }
  @Input() public set resources(value: (Resource | ResourceGroup)[]) {
    this.resources$.next(value);
  }
  //#endregion

  private addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  onPreviousWeekOrMonth() {
    this.onChangeWeekOrMonth(false);
  }

  onNextWeekOrMonth() {
    this.onChangeWeekOrMonth(true);
  }

  private onChangeWeekOrMonth(next: boolean) {
    combineLatest([this.currentWeekOrMonth$, this.mode$])
      .pipe(map(([currentWeekOrMonth, mode]) => {
        switch (mode) {
          case ESchedulerMode.week: {
            return this.addDays(currentWeekOrMonth, (next ? 7 : -7));
          }
          case ESchedulerMode.timeline: {
            return new Date(currentWeekOrMonth.getFullYear(), currentWeekOrMonth.getMonth() + (next ? 1 : -1), 1);
          }
        }
      }), take(1))
      .subscribe((w) => this.currentWeekOrMonth$.next(w));
  }

  onHoverEvent(ev: SchedulerEvent | null) {
    this.hoveredEvent$.next(ev);
  }

  onLeaveEvent(ev: SchedulerEvent | null) {
    this.hoveredEvent$.next(null);
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
        color: '#F00',
        description: 'Test event',
      },
      meta: null,
    };
    this.previewEvent$.next({ start: slot.start, end: slot.end });
  }

  randomColor() {
    const brightness = 128;
    return '#' + this.randomChannel(brightness) + this.randomChannel(brightness) + this.randomChannel(brightness);
  }
  randomChannel(brightness: number){
    const r = 255-brightness;
    const n = 0|((Math.random() * r) + brightness);
    const s = n.toString(16);
    return (s.length==1) ? '0'+s : s;
  }

  onStartDragEvent(eventPart: SchedulerEventPart, ev: MouseEvent) {
    ev.preventDefault();
    this.hoveredTimeSlot$.pipe(take(1)).subscribe((hoveredTimeSlot) => {
      if (eventPart.event) {
        this.dragStartTimeslot = hoveredTimeSlot;
        this.operation = {
          operation: EDragOperation.moveEvent,
          event: eventPart.event,
          meta: null,
        };
        this.previewEvent$.next({ start: eventPart.event.start, end: eventPart.event.end });
      }
    });
  }

  onStartResizeEvent(event: SchedulerEvent | null, position: 'top' | 'bottom') {
    if (event) {
      switch (position) {
        case 'top': {
          this.operation = {
            operation: EDragOperation.resizeEvent,
            event: event,
            meta: { position },
          }
          this.previewEvent$.next({ start: event.start, end: event.end });
        } break;
        case 'bottom': {
          this.operation = {
            operation: EDragOperation.resizeEvent,
            event: event,
            meta: { position },
          }
          this.previewEvent$.next({ start: event.start, end: event.end });
        } break;
      }
    }
  }

  //#region hoveredTimeslot$
  private getHoveredTimeslot(ev: MouseEvent, timeSlots: SchedulerStampWithSlots[]) {
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

    const slot = timeSlots[row].slots[column];
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
              this.previewEvent$
                .pipe(filter((ev) => !!ev && !!this.dragStartTimeslot))
                .pipe(map((ev) => {
                  if (ev && this.dragStartTimeslot) {
                    const result =  <PreviewEvent>{
                      start: new Date(ev.start.getTime() + hovered.start.getTime() - this.dragStartTimeslot.start.getTime()),
                      end: new Date(ev.end.getTime() + hovered.start.getTime() - this.dragStartTimeslot.start.getTime())
                    };
                    
                    this.dragStartTimeslot = hovered;

                    return result;
                  } else {
                    return ev;
                  }
                }))
                .pipe(take(1))
                .subscribe(ev => this.previewEvent$.next(ev));
            }
          } break;
          case EDragOperation.resizeEvent: {
            if (hovered) {
              this.previewEvent$
                .pipe(filter((ev) => !!ev))
                .pipe(map((ev) => {
                  if (ev && this.operation && this.operation.event) {
                    if (this.operation.meta.position === 'top') {
                      ev.start = hovered.start;
                      ev.end = this.operation.event.end;
                    } else if (this.operation.meta.position === 'bottom') {
                      ev.start = this.operation.event.start;
                      ev.end = hovered.end;
                    }
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
                this.resources$.next([
                  ...this.resources$.value,
                  <Resource>{
                    description: 'New resource group',
                    events: [{
                      start: previewEvent.start,
                      end: previewEvent.end,
                      color: this.randomColor(),
                      description: 'New event'
                    }]
                  }
                ]);
                this.previewEvent$.next(null);
              }
            });
        } break;
        case EDragOperation.moveEvent:
        case EDragOperation.resizeEvent: {
          this.previewEvent$
            .pipe(filter((ev) => !!ev))
            .pipe(take(1))
            .subscribe((previewEvent) => {
              if (this.operation && this.operation.event && previewEvent) {
                this.operation.event.start = previewEvent.start;
                this.operation.event.end = previewEvent.end;
                this.operation = null;
                this.dragStartTimeslot = null;
                this.resources$.next(this.resources$.value);
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
