import { AfterViewInit, ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, effect, ElementRef, input, model, viewChild } from '@angular/core';
import { FirstDayOfWeek, MpCalendarElement } from '@mintplayer/web-components/calendar';
// Side-effect: registers <mp-calendar>. Importing the element class is enough —
// the file calls customElements.define() on load.
void MpCalendarElement;

@Component({
  selector: 'bs-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCalendarComponent implements AfterViewInit {
  currentMonth = model<Date>(new Date());
  selectedDate = model<Date>(new Date());
  disableDateFn = input<((date: Date) => boolean) | undefined>(undefined);
  min = input<Date | undefined>(undefined);
  max = input<Date | undefined>(undefined);
  firstDayOfWeek = input<FirstDayOfWeek>(1);
  locale = input<string | undefined>(undefined);

  readonly wcRef = viewChild<ElementRef<MpCalendarElement>>('wc');

  constructor() {
    // Sync Angular signal state into the WC properties on every change.
    effect(() => {
      const wc = this.wcRef()?.nativeElement;
      if (!wc) return;
      wc.selectedDate = this.selectedDate();
      wc.currentMonth = this.currentMonth();
      wc.disableDateFn = this.disableDateFn() ?? null;
      wc.min = this.min() ?? null;
      wc.max = this.max() ?? null;
      wc.firstDayOfWeek = this.firstDayOfWeek();
      wc.locale = this.locale();
      // SSR / pre-upgrade: requestUpdate only exists after customElements has
      // registered the Lit class. The DOM element is the upgrade target but
      // may still be a plain HTMLElement at the first effect tick.
      wc.requestUpdate?.();
    });
  }

  ngAfterViewInit(): void {
    // Initial sync happens via effect once the view child resolves.
  }

  onSelectedDateChange(event: Event): void {
    const detail = (event as CustomEvent<Date>).detail;
    if (detail instanceof Date) this.selectedDate.set(detail);
  }

  onCurrentMonthChange(event: Event): void {
    const detail = (event as CustomEvent<Date>).detail;
    if (detail instanceof Date) this.currentMonth.set(detail);
  }
}
