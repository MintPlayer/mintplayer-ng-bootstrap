import { calendarKeyTarget, isDateDisabled, isoDate, isSameYearMonth, monthOf, parseIsoDate, type DateLimits, type FirstDayOfWeek } from './calendar';

/**
 * The month grid's DOM behaviour, delegated on the element that renders
 * `connectCalendar`'s view: shared by the calendar core and the pickers that
 * render the same grid in their popup.
 */
export interface CalendarGridHost {
  month(): Date;
  firstDayOfWeek(): FirstDayOfWeek;
  limits(): DateLimits;
  /** Show another month (always the first of it). */
  showMonth(month: Date): void;
  /** Move the roving cell; the grid focuses it once rendered. */
  setFocused(date: Date): void;
  /** A day chosen by click, Enter or Space. Never a disabled day. */
  select(date: Date): void;
}

const dayCell = (target: EventTarget | null, root: HTMLElement) => {
  const cell = (target as Element | null)?.closest?.<HTMLElement>('[data-date]');
  return cell && root.contains(cell) ? cell : null;
};

/**
 * Focus the cell of `date` once the front has rendered it. A move inside the
 * month finds the cell at once; a move into another month waits for the
 * re-render, which every front completes within a few frames.
 */
export function focusCalendarCell(root: HTMLElement, date: string, frames = 6): void {
  const cell = root.querySelector<HTMLElement>(`[data-date="${date}"]`);
  if (cell) {
    cell.focus();
    return;
  }
  if (frames > 0 && typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => focusCalendarCell(root, date, frames - 1));
  }
}

export function attachCalendarGrid(root: HTMLElement, host: CalendarGridHost): () => void {
  const choose = (date: Date) => {
    if (isDateDisabled(date, host.limits())) return;
    host.setFocused(date);
    host.select(date);
  };

  const onClick = (event: MouseEvent) => {
    const action = (event.target as Element | null)?.closest?.<HTMLElement>('[data-calendar-action]');
    if (action && root.contains(action)) {
      const month = host.month();
      host.showMonth(new Date(month.getFullYear(), month.getMonth() + (action.dataset['calendarAction'] === 'previous' ? -1 : 1), 1));
      return;
    }
    const date = parseIsoDate(dayCell(event.target, root)?.dataset['date']);
    if (date) choose(date);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const cell = dayCell(event.target, root);
    const from = parseIsoDate(cell?.dataset['date']);
    if (!cell || !from) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      choose(from);
      return;
    }
    const rtl = getComputedStyle(cell).direction === 'rtl';
    const target = calendarKeyTarget(event.key, from, { firstDayOfWeek: host.firstDayOfWeek(), rtl, ctrlKey: event.ctrlKey });
    if (!target) return;
    event.preventDefault();
    if (!isSameYearMonth(target, host.month())) host.showMonth(monthOf(target));
    host.setFocused(target);
    focusCalendarCell(root, isoDate(target));
  };

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeyDown);
  return () => {
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeyDown);
  };
}
