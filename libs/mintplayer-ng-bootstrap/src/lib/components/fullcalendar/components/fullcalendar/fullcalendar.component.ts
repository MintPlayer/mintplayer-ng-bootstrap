import { Component, ElementRef, HostListener, OnDestroy, QueryList, ViewChildren } from '@angular/core';
import { BsCalendarMonthService } from '../../../../services/calendar-month/calendar-month.service';
import { BehaviorSubject, combineLatest, map, Observable, Subject, take, tap } from 'rxjs';
import { FullcalendarEvent } from '../../interfaces/fullcalendar-event';
import { FullCalendarEventPart } from '../../interfaces/fullcalendar-event-part';
import { FullcalendarEventWithParts } from '../../interfaces/fullcalendar-event-with-parts';
import { TimeSlot } from '../../interfaces/time-slot';

@Component({
  selector: 'bs-fullcalendar',
  templateUrl: './fullcalendar.component.html',
  styleUrls: ['./fullcalendar.component.scss']
})
export class BsFullcalendarComponent implements OnDestroy {

  constructor(private calendarMonthService: BsCalendarMonthService) {
    const monday = this.calendarMonthService.getMondayBefore(new Date());
    this.currentWeek$ = new BehaviorSubject<Date>(monday);

    this.daysOfWeek$ = this.currentWeek$
      .pipe(map((weekMonday) => {
        weekMonday.setHours(0); weekMonday.setMinutes(0); weekMonday.setSeconds(0);
        return Array.from(Array(7).keys()).map((x) => this.addDays(weekMonday, x));
      }));

    this.eventParts$ = this.events$
      .pipe(map((events) => {
        return events.map((ev) => {
          let startTime = ev.start;
          console.log(`startTime: ${startTime}, end: ${ev.end}`);
          const result: FullCalendarEventPart[] = [];
          while (!this.dateEquals(startTime, ev.end)) {
            const end = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate() + 1, 0, 0, 0);
            result.push({
              start: startTime,
              end: end,
              event: ev
            });
            startTime = end;
          }
          if (startTime != ev.end) {
            result.push({
              start: startTime,
              end: ev.end,
              event: ev
            });
          }

          return <FullcalendarEventWithParts>{
            event: ev,
            parts: result
          };
        });
      }));

    this.timeSlots$ = combineLatest([this.daysOfWeek$, this.timeSlotDuration$]) 
      .pipe(map(([daysOfWeek, duration]) => {
        const timeSlotsPerDay = Math.floor((60 * 60 * 24) / duration);

        return Array.from(Array(timeSlotsPerDay).keys()).map((index) => {

          const timeSlotStart = new Date(daysOfWeek[0]); timeSlotStart.setSeconds(timeSlotStart.getSeconds() + index * duration);
          const timeSlotEnd = new Date(timeSlotStart); timeSlotEnd.setSeconds(timeSlotEnd.getSeconds() + duration);
          
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
      }));
  }

  events$ = new BehaviorSubject<FullcalendarEvent[]>([]);
  eventParts$: Observable<FullcalendarEventWithParts[]>;
  currentWeek$: BehaviorSubject<Date>;
  daysOfWeek$: Observable<Date[]>;
  timeSlotDuration$ = new BehaviorSubject<number>(1800);
  timeSlots$: Observable<TimeSlot[][]>;
  hoveredTimeSlot$ = new BehaviorSubject<TimeSlot | null>(null);
  destroyed$ = new Subject();
  
  @ViewChildren('slot') timeSlotElements!: QueryList<ElementRef<HTMLDivElement>>;

  private dateEquals(date1: Date, date2: Date) {
    return (date1.getFullYear() === date2.getFullYear()) && (date1.getMonth() === date2.getMonth()) && (date1.getDate() === date2.getDate());
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
    this.dragStartTimeslot = slot;
    this.newEvent = { start: slot.start, end: slot.end, color: '#F00', description: 'Test event' }

    this.events$
      .pipe(take(1))
      .pipe(map((events) => {
        if (this.newEvent) {
          events.push(this.newEvent);
        }
        return events;
      })).subscribe((events) => {
        this.events$.next(events);
      });
  }

  @HostListener('mousemove', ['$event'])
  onMousemove(ev: MouseEvent) {
    if (this.newEvent) {
      const hoveredSlots = this.timeSlotElements.filter((el) => {
        const rct = el.nativeElement.getBoundingClientRect();
        if ((rct.left <= ev.x) && (ev.x <= rct.right) && (rct.top <= ev.y) && (ev.y <= rct.bottom)) {
          // el.nativeElement.style.backgroundColor = '#FF0';
          return true;
        } else {
          // el.nativeElement.style.backgroundColor = '';
          return false;
        }
      });

      if (hoveredSlots.length > 0) {
        this.timeSlots$.pipe(take(1))
          .subscribe((timeSlots) => {
            const slotElement = hoveredSlots[0];

            const strRow = slotElement.nativeElement.getAttribute('data-row');
            if (!strRow) return;
            const row = parseInt(strRow);

            const strColumn = slotElement.nativeElement.getAttribute('data-column');
            if (!strColumn) return;
            const column = parseInt(strColumn);

            const slot = timeSlots[row][column];
            if (this.newEvent) {
              console.log('hovered slot', slot);
              this.newEvent.end = slot.end;
            }
          });
      }

    }
  }

  // onHoverSlot(event: MouseEvent, slot: TimeSlot) {
  //   console.log('hover slot', slot);
  //   let el: HTMLElement;
  //   if (el.getBoundingClientRect().)
  // }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }

}
