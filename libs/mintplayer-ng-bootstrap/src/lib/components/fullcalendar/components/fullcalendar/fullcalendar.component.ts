import {
  ChangeDetectorRef,
  Component,
  DoCheck,
  ElementRef,
  HostListener,
  IterableDiffer,
  IterableDiffers,
  KeyValueDiffer,
  KeyValueDiffers,
  NgZone,
  OnDestroy,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { BsCalendarMonthService } from '../../../../services/calendar-month/calendar-month.service';
import {
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
  Subject,
  take,
  tap,
} from 'rxjs';
import { FullcalendarEvent } from '../../interfaces/fullcalendar-event';
import { FullCalendarEventPart } from '../../interfaces/fullcalendar-event-part';
import { FullcalendarEventWithParts } from '../../interfaces/fullcalendar-event-with-parts';
import { TimeSlot } from '../../interfaces/time-slot';

@Component({
  selector: 'bs-fullcalendar',
  templateUrl: './fullcalendar.component.html',
  styleUrls: ['./fullcalendar.component.scss'],
})
export class BsFullcalendarComponent implements DoCheck, OnDestroy {
  constructor(
    private calendarMonthService: BsCalendarMonthService,
    private zone: NgZone,
    private ref: ChangeDetectorRef,
    private iterableDiffers: IterableDiffers,
    private keyValueDiffers: KeyValueDiffers
  ) {
    const monday = this.calendarMonthService.getMondayBefore(new Date());
    this.currentWeek$ = new BehaviorSubject<Date>(monday);

    this.daysOfWeek$ = this.currentWeek$.pipe(
      map((weekMonday) => {
        weekMonday.setHours(0);
        weekMonday.setMinutes(0);
        weekMonday.setSeconds(0);
        return Array.from(Array(7).keys()).map((x) =>
          this.addDays(weekMonday, x)
        );
      })
    );

    this.events$ = new BehaviorSubject<FullcalendarEvent[]>([]);
    this.eventParts$ = this.events$.pipe(
      map((events) => {
        return events.map((ev) => {
          let startTime = ev.start;
          console.log(`startTime: ${startTime}, end: ${ev.end}`);
          const result: FullCalendarEventPart[] = [];
          while (!this.dateEquals(startTime, ev.end)) {
            const end = new Date(
              startTime.getFullYear(),
              startTime.getMonth(),
              startTime.getDate() + 1,
              0,
              0,
              0
            );
            result.push({
              start: startTime,
              end: end,
              //event: ev
            });
            startTime = end;
          }
          if (startTime != ev.end) {
            result.push({
              start: startTime,
              end: ev.end,
              //event: ev
            });
          }

          return <FullcalendarEventWithParts>{
            event: ev,
            parts: result,
          };
        });
      })
    );

    this.timeSlots$ = combineLatest([
      this.daysOfWeek$,
      this.timeSlotDuration$,
    ]).pipe(
      map(([daysOfWeek, duration]) => {
        const timeSlotsPerDay = Math.floor((60 * 60 * 24) / duration);

        return Array.from(Array(timeSlotsPerDay).keys()).map((index) => {
          const timeSlotStart = new Date(daysOfWeek[0]);
          timeSlotStart.setSeconds(
            timeSlotStart.getSeconds() + index * duration
          );
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

            return <TimeSlot>{
              start,
              end,
            };
          });
        });

        // const allTimeSlots = daysOfWeek.map((day) => {
        //   const timeSlotsForDay = Array.from(Array(timeSlotsPerDay).keys()).map((index) => {

        //     const timeSlotStart = new Date(day); timeSlotStart.setSeconds(timeSlotStart.getSeconds() + index * duration);
        //     const timeSlotEnd = new Date(timeSlotStart); timeSlotEnd.setSeconds(timeSlotEnd.getSeconds() + duration);
        //     return <TimeSlot>{
        //       start: timeSlotStart,
        //       end: timeSlotEnd,
        //     };

        //   });
        //   return timeSlotsForDay;
        // });

        // return allTimeSlots.reduce((a, b) => a.concat(b), []);
      })
    );

    this.eventListDiffer = iterableDiffers.find([]).create<FullcalendarEvent>();
  }

  events$: BehaviorSubject<FullcalendarEvent[]>;
  eventParts$: Observable<FullcalendarEventWithParts[]>;
  currentWeek$: BehaviorSubject<Date>;
  daysOfWeek$: Observable<Date[]>;
  timeSlotDuration$ = new BehaviorSubject<number>(1800);
  timeSlots$: Observable<TimeSlot[][]>;
  mouseState$ = new BehaviorSubject<boolean>(false);
  hoveredTimeSlot$ = new BehaviorSubject<TimeSlot | null>(null);
  destroyed$ = new Subject();

  eventListDiffer: IterableDiffer<FullcalendarEvent>;
  eventDiffers: { ev: FullcalendarEvent; differ: KeyValueDiffer<any, any> }[] =
    [];

  @ViewChildren('slot') timeSlotElements!: QueryList<
    ElementRef<HTMLDivElement>
  >;

  ngDoCheck() {
    const eventListChanges = this.eventListDiffer.diff(this.events$.value);
    if (eventListChanges) {
      console.log('Events changed', eventListChanges);
      eventListChanges.forEachAddedItem((item) => {
        const eventDiffer = this.keyValueDiffers.find(item.item).create<any, any>();
        this.eventDiffers.push({ ev: item.item, differ: eventDiffer });
      });
    }
    for (const eventDiffer of this.eventDiffers) {
      const eventChanges = eventDiffer.differ.diff(eventDiffer.ev);
      if (eventChanges) {
        console.log('An event changed', eventChanges);
        this.ref.detectChanges();
      }
    }
  }

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
      .pipe(
        map((w) => this.addDays(w, -7)),
        take(1)
      )
      .subscribe((w) => this.currentWeek$.next(w));
  }

  onNextWeek() {
    this.currentWeek$
      .pipe(
        map((w) => this.addDays(w, 7)),
        take(1)
      )
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
      if (
        rct.left <= ev.x &&
        ev.x <= rct.right &&
        rct.top <= ev.y &&
        ev.y <= rct.bottom
      ) {
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

      if (
        this.newEvent &&
        hovered &&
        this.newEvent.end.getTime() != hovered.end.getTime()
      ) {
        // console.log('set event.end', { old: this.newEvent.end, new: hovered.end });
        this.zone.run(() => {
          if (this.newEvent) {
            this.newEvent.end = hovered.end;
            this.ref.detectChanges();
          }
        });
      }
    });

    // if (this.newEvent) {
    // }
  }
  //#endregion

  @HostListener('mouseup', ['$event'])
  onMouseUp(ev: MouseEvent) {
    if (this.newEvent) {
      this.newEvent = null;
    }
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
