import { Component, ElementRef, HostListener, OnDestroy, QueryList, ViewChildren } from '@angular/core';
import { BehaviorSubject, combineLatest, map, mergeAll, Observable, Subject, take, takeUntil } from 'rxjs';
import { BsCalendarMonthService } from '../../../../services/calendar-month/calendar-month.service';
import { FullcalendarEvent } from '../../interfaces/fullcalendar-event';
import { FullCalendarEventPart } from '../../interfaces/fullcalendar-event-part';
import { FullcalendarEventWithParts } from '../../interfaces/fullcalendar-event-with-parts';
import { TimeSlot } from '../../interfaces/time-slot';

@Component({
  selector: 'bs-fullcalendar',
  templateUrl: './fullcalendar.component.html',
  styleUrls: ['./fullcalendar.component.scss'],
})
export class BsFullcalendarComponent implements OnDestroy {
  constructor(private calendarMonthService: BsCalendarMonthService) {
    const monday = this.calendarMonthService.getMondayBefore(new Date());
    this.currentWeek$ = new BehaviorSubject<Date>(monday);

    this.daysOfWeek$ = this.currentWeek$.pipe(
      map((weekMonday) => {
        weekMonday.setHours(0);
        weekMonday.setMinutes(0);
        weekMonday.setSeconds(0);
        return Array.from(Array(7).keys()).map((x) => this.addDays(weekMonday, x));
      })
    );

    this.events$ = new BehaviorSubject<FullcalendarEvent[]>([]);
    this.eventParts$ = this.events$.pipe(
      map((events) => {
        return events.map((ev) => {
          let startTime = ev.start;
          const result: FullCalendarEventPart[] = [];
          while (!this.dateEquals(startTime, ev.end)) {
            const end = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate() + 1, 0, 0, 0);
            result.push({ start: startTime, end: end, event: ev });
            startTime = end;
          }
          if (startTime != ev.end) {
            result.push({ start: startTime, end: ev.end, event: ev });
          }

          return <FullcalendarEventWithParts>{ event: ev, parts: result };
        });
      })
    );

    combineLatest([
        this.daysOfWeek$
          .pipe(map((daysOfWeek) => {
            return { start: daysOfWeek[0].getTime(), end: daysOfWeek[daysOfWeek.length - 1].getTime() + 24 * 60 * 60 * 1000 };
          })),
        this.eventParts$
          .pipe(map(eventParts => eventParts.map(evp => evp.parts)))
          .pipe(map(jaggedParts => {
            return jaggedParts.reduce((flat, toFlatten) => flat.concat(toFlatten), []);
          })),
        this.eventParts$
      ])
      .pipe(map(([startAndEnd, eventParts, originalEventParts]) => {
        return eventParts.filter(eventPart => {
          return !((eventPart.end.getTime() < startAndEnd.start) || (eventPart.start.getTime() > startAndEnd.end));
        });
      }))
      .pipe(takeUntil(this.destroyed$))
      .subscribe((eventPartsForThisWeek) => {
        this.eventPartsForThisWeek$.next(eventPartsForThisWeek);
      });

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

            const end = new Date(day);
            end.setHours(timeSlotEnd.getHours());
            end.setMinutes(timeSlotEnd.getMinutes());
            end.setSeconds(timeSlotEnd.getSeconds());

            return <TimeSlot>{ start, end };
          });
        });

      }));
  }

  events$: BehaviorSubject<FullcalendarEvent[]>;
  eventParts$: Observable<FullcalendarEventWithParts[]>;
  eventPartsForThisWeek$ = new BehaviorSubject<FullCalendarEventPart[]>([]);
  currentWeek$: BehaviorSubject<Date>;
  daysOfWeek$: Observable<Date[]>;
  timeSlotDuration$ = new BehaviorSubject<number>(1800);
  timeSlots$: Observable<TimeSlot[][]>;
  mouseState$ = new BehaviorSubject<boolean>(false);
  hoveredTimeSlot$ = new BehaviorSubject<TimeSlot | null>(null);
  destroyed$ = new Subject();

  @ViewChildren('slot') timeSlotElements!: QueryList<ElementRef<HTMLDivElement>>;

  private dateEquals(date1: Date, date2: Date) {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  }

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

  newEvent: FullcalendarEvent | null = null;
  dragStartTimeslot: TimeSlot | null = null;
  onCreateEvent(ev: MouseEvent, slot: TimeSlot) {
    ev.preventDefault();
    this.mouseState$.next(true);
    this.dragStartTimeslot = slot;
    this.newEvent = {
      start: slot.start,
      end: slot.end,
      color: '#F00',
      description: 'Test event',
    };
    this.events$.next([...this.events$.value, this.newEvent]);
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

  @HostListener('mousemove', ['$event'])
  onMousemove(ev: MouseEvent) {
    this.timeSlots$.pipe(take(1)).subscribe((timeSlots) => {
      const hovered = this.getHoveredTimeslot(ev, timeSlots);
      this.hoveredTimeSlot$.next(hovered);

      if (this.newEvent && this.dragStartTimeslot && hovered && (this.newEvent.end.getTime() != hovered.end.getTime())) {
        if (this.dragStartTimeslot.start.getTime() === hovered.start.getTime()) {
          // 1 slot
        } else if (this.dragStartTimeslot.start.getTime() < hovered.start.getTime()) {
          // Drag down
          this.newEvent.start = this.dragStartTimeslot.start;
          this.newEvent.end = hovered.end;
          this.events$.next(this.events$.value);
        } else if (this.dragStartTimeslot.start.getTime() > hovered.start.getTime()) {
          // Drag up
          this.newEvent.start = hovered.start;
          this.newEvent.end = this.dragStartTimeslot.end;
          this.events$.next(this.events$.value);
        }
        
      }
    });
  }
  //#endregion

  @HostListener('mouseup', ['$event'])
  onMouseUp(ev: MouseEvent) {
    if (this.newEvent) {
      this.newEvent = null;
      this.dragStartTimeslot = null;
    }
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
