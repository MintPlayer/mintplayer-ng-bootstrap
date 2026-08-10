/**
 * Linear + time scales for the trend chart. Pure functions; the time ticks
 * are the genuinely fiddly part, so they live here behind table-driven specs
 * rather than inside the element.
 */

export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): (value: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  return (value) => (span === 0 ? (r0 + r1) / 2 : r0 + ((value - d0) / span) * (r1 - r0));
}

/** Largest 1-2-5 step not exceeding a "nice" division of the span into ~count intervals. */
function niceStep(span: number, count: number): number {
  const raw = span / Math.max(1, count);
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const residual = raw / magnitude;
  const factor = residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1;
  return factor * magnitude;
}

/** Ticks at 1-2-5 steps covering [min, max]; endpoints snapped outward to the step. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!(max > min)) return [min];
  const step = niceStep(max - min, count);
  const start = Math.ceil(min / step) * step;
  const n = Math.floor((max - start) / step + 1e-9) + 1;
  return Array.from({ length: Math.max(0, n) }, (_, i) => round(start + i * step));
}

/** Domain snapped outward to the tick step, for un-pinned axes. */
export function niceDomain(min: number, max: number, count = 5): [number, number] {
  if (!(max > min)) return [min - 1, max + 1];
  const step = niceStep(max - min, count);
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

const round = (v: number): number => Math.round(v * 1e9) / 1e9;

export interface TimeTick {
  /** Epoch milliseconds. */
  time: number;
  label: string;
}

type TimeUnit = 'hour' | 'day' | 'week' | 'month' | 'year';

interface Ladder {
  unit: TimeUnit;
  /** Multiples of the unit per step. */
  every: number;
  approxMs: number;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const LADDER: Ladder[] = [
  { unit: 'hour', every: 1, approxMs: HOUR },
  { unit: 'hour', every: 3, approxMs: 3 * HOUR },
  { unit: 'hour', every: 6, approxMs: 6 * HOUR },
  { unit: 'hour', every: 12, approxMs: 12 * HOUR },
  { unit: 'day', every: 1, approxMs: DAY },
  { unit: 'day', every: 2, approxMs: 2 * DAY },
  { unit: 'week', every: 1, approxMs: 7 * DAY },
  { unit: 'week', every: 2, approxMs: 14 * DAY },
  { unit: 'month', every: 1, approxMs: 30 * DAY },
  { unit: 'month', every: 3, approxMs: 91 * DAY },
  { unit: 'month', every: 6, approxMs: 182 * DAY },
  { unit: 'year', every: 1, approxMs: 365 * DAY },
  { unit: 'year', every: 2, approxMs: 730 * DAY },
  { unit: 'year', every: 5, approxMs: 1826 * DAY },
  { unit: 'year', every: 10, approxMs: 3652 * DAY },
];

/** First unit boundary at or after t (local time). */
function ceilToUnit(t: number, unit: TimeUnit, every: number): Date {
  const d = new Date(t);
  const floor = (() => {
    switch (unit) {
      case 'hour': {
        const h = Math.floor(d.getHours() / every) * every;
        return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h);
      }
      case 'day':
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
      case 'week': {
        // Weeks tick on Mondays.
        const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dow = (midnight.getDay() + 6) % 7;
        return new Date(midnight.getFullYear(), midnight.getMonth(), midnight.getDate() - dow);
      }
      case 'month': {
        const m = Math.floor(d.getMonth() / every) * every;
        return new Date(d.getFullYear(), m, 1);
      }
      case 'year': {
        const y = Math.floor(d.getFullYear() / every) * every;
        return new Date(y, 0, 1);
      }
    }
  })();
  return floor.getTime() >= t ? floor : advance(floor, unit, every);
}

function advance(d: Date, unit: TimeUnit, every: number): Date {
  switch (unit) {
    case 'hour': return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + every);
    case 'day': return new Date(d.getFullYear(), d.getMonth(), d.getDate() + every);
    case 'week': return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7 * every);
    case 'month': return new Date(d.getFullYear(), d.getMonth() + every, 1);
    case 'year': return new Date(d.getFullYear() + every, 0, 1);
  }
}

function formatter(unit: TimeUnit, spansYears: boolean, locale?: string): Intl.DateTimeFormat {
  const options: Intl.DateTimeFormatOptions =
    unit === 'hour' ? { hour: 'numeric', minute: '2-digit' }
    : unit === 'day' || unit === 'week' ? (spansYears ? { month: 'short', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric' })
    : unit === 'month' ? { month: 'short', year: 'numeric' }
    : { year: 'numeric' };
  return new Intl.DateTimeFormat(locale, options);
}

/**
 * Locale-aware calendar-boundary ticks over [from, to] (epoch ms, local time).
 * Picks the smallest hour/day/week/month/year step that yields at most
 * ~targetCount ticks; labels via Intl.DateTimeFormat.
 */
export function timeTicks(from: number, to: number, targetCount = 6, locale?: string): TimeTick[] {
  if (!(to > from)) return [];
  const span = to - from;
  const rung =
    LADDER.find((l) => span / l.approxMs <= targetCount) ?? LADDER[LADDER.length - 1];
  const spansYears = new Date(from).getFullYear() !== new Date(to).getFullYear();
  const format = formatter(rung.unit, spansYears, locale);

  const ticks: TimeTick[] = [];
  const push = (d: Date): Date => {
    if (d.getTime() <= to) ticks.push({ time: d.getTime(), label: format.format(d) });
    return advance(d, rung.unit, rung.every);
  };
  let cursor = ceilToUnit(from, rung.unit, rung.every);
  while (cursor.getTime() <= to && ticks.length < targetCount * 3) cursor = push(cursor);
  return ticks;
}
