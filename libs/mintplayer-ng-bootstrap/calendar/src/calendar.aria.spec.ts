import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsUcFirstPipe } from '@mintplayer/ng-bootstrap/uc-first';
import { BsMonthNamePipe } from '@mintplayer/ng-bootstrap/calendar-month';
import { MockPipe } from 'ng-mocks';
import { describe, it, expect, beforeEach } from 'vitest';

import { BsCalendarComponent } from './calendar.component';

async function flush(fixture: ComponentFixture<BsCalendarComponent>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

function setMonth(component: BsCalendarComponent, year: number, month: number): void {
  component.currentMonth.set(new Date(year, month, 1));
}

function dispatchKey(cell: HTMLElement, key: string, opts: { ctrlKey?: boolean } = {}): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ctrlKey: opts.ctrlKey ?? false });
  cell.dispatchEvent(ev);
  return ev;
}

function findCell(host: HTMLElement, year: number, month: number, day: number): HTMLElement | null {
  return host.querySelector<HTMLElement>(`td[id$="-cell-${year}-${month}-${day}"]`);
}

describe('bs-calendar — APG Date Picker grid roles', () => {
  let component: BsCalendarComponent;
  let fixture: ComponentFixture<BsCalendarComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MockPipe(BsUcFirstPipe), MockPipe(BsMonthNamePipe), BsCalendarComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BsCalendarComponent);
    component = fixture.componentInstance;
    setMonth(component, 2026, 4); // May 2026
    component.selectedDate.set(new Date(2026, 4, 15));
    await flush(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  it('table is role="grid" with aria-labelledby pointing at the month-title cell', () => {
    const table = host.querySelector('table')!;
    expect(table.getAttribute('role')).toBe('grid');
    const labelledBy = table.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(host.querySelector(`#${labelledBy}`)).not.toBeNull();
  });

  it('weekday header row uses role="row" / role="columnheader"', () => {
    const headerRow = host.querySelectorAll('tr[role="row"]')[0];
    expect(headerRow).not.toBeUndefined();
    const headers = headerRow.querySelectorAll('th[role="columnheader"]');
    expect(headers.length).toBeGreaterThanOrEqual(7);
  });

  it('week-number cells are role="rowheader"', () => {
    const rowHeaders = host.querySelectorAll('th[role="rowheader"]');
    expect(rowHeaders.length).toBeGreaterThan(0);
  });

  it('day cells are role="gridcell" with stable ids', () => {
    const cell = findCell(host, 2026, 4, 15);
    expect(cell).not.toBeNull();
    expect(cell!.getAttribute('role')).toBe('gridcell');
  });

  it('exactly one day cell carries tabindex="0" (roving tabindex)', () => {
    const tabbable = host.querySelectorAll('td[tabindex="0"]');
    expect(tabbable.length).toBe(1);
    // The selectedDate (2026-04-15 i.e. May 15 since month is 0-indexed) lands inside currentMonth.
    expect(tabbable[0].id).toContain('-cell-2026-4-15');
  });

  it('falls back to today, then first enabled day, when neither selection nor today is in-month', () => {
    component.selectedDate.set(new Date(2025, 0, 1));
    setMonth(component, 2030, 5); // June 2030 — selection + today both out-of-month
    fixture.detectChanges();
    const tabbable = host.querySelectorAll('td[tabindex="0"]');
    expect(tabbable.length).toBe(1);
  });
});

describe('bs-calendar — keyboard navigation', () => {
  let component: BsCalendarComponent;
  let fixture: ComponentFixture<BsCalendarComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MockPipe(BsUcFirstPipe), MockPipe(BsMonthNamePipe), BsCalendarComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(BsCalendarComponent);
    component = fixture.componentInstance;
    setMonth(component, 2026, 4); // May 2026
    component.selectedDate.set(new Date(2026, 4, 15));
    await flush(fixture);
    host = fixture.nativeElement as HTMLElement;
  });

  it('ArrowRight advances focusedDate by one day', () => {
    const cell = findCell(host, 2026, 4, 15)!;
    dispatchKey(cell, 'ArrowRight');
    fixture.detectChanges();
    expect(component.focusedDate()!.getDate()).toBe(16);
  });

  it('ArrowLeft on day-1 of the month rolls to the previous month and updates currentMonth', () => {
    component.focusedDate.set(new Date(2026, 4, 1));
    fixture.detectChanges();
    const cell = findCell(host, 2026, 4, 1)!;
    dispatchKey(cell, 'ArrowLeft');
    fixture.detectChanges();
    expect(component.currentMonth().getMonth()).toBe(3); // April
    expect(component.focusedDate()!.getDate()).toBe(30);
  });

  it('ArrowDown moves focus by 7 days (next week)', () => {
    const cell = findCell(host, 2026, 4, 15)!;
    dispatchKey(cell, 'ArrowDown');
    fixture.detectChanges();
    expect(component.focusedDate()!.getDate()).toBe(22);
  });

  it('PageDown advances by one month; Ctrl+PageDown by one year', () => {
    let cell = findCell(host, 2026, 4, 15)!;
    dispatchKey(cell, 'PageDown');
    fixture.detectChanges();
    expect(component.currentMonth().getMonth()).toBe(5); // June

    // Re-fetch after re-render.
    cell = findCell(host, 2026, 5, 15)!;
    dispatchKey(cell, 'PageDown', { ctrlKey: true });
    fixture.detectChanges();
    expect(component.currentMonth().getFullYear()).toBe(2027);
  });

  it('Home jumps to the first day of the focused week', () => {
    // 2026-05-15 is a Friday (day 5) → Home goes to day 10 (Sunday).
    const cell = findCell(host, 2026, 4, 15)!;
    dispatchKey(cell, 'Home');
    fixture.detectChanges();
    expect(component.focusedDate()!.getDate()).toBe(10);
  });

  it('End jumps to the last day of the focused week', () => {
    const cell = findCell(host, 2026, 4, 15)!;
    dispatchKey(cell, 'End');
    fixture.detectChanges();
    expect(component.focusedDate()!.getDate()).toBe(16); // Saturday
  });

  it('Enter selects the focused date', () => {
    const cell = findCell(host, 2026, 4, 20)!;
    dispatchKey(cell, 'Enter');
    fixture.detectChanges();
    expect(component.selectedDate().getDate()).toBe(20);
  });

  it('preventDefault is called on navigation keys', () => {
    const cell = findCell(host, 2026, 4, 15)!;
    const ev = dispatchKey(cell, 'ArrowRight');
    expect(ev.defaultPrevented).toBe(true);
  });

  it('does not preventDefault on unrelated keys', () => {
    const cell = findCell(host, 2026, 4, 15)!;
    const ev = dispatchKey(cell, 'a');
    expect(ev.defaultPrevented).toBe(false);
  });
});
