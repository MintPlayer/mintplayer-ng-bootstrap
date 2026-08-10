/**
 * Annular-sector path math for the sunburst layout. Pure string-in/string-out
 * so it is trivially unit-testable (jsdom has no SVG geometry APIs at all).
 *
 * Convention: angles in radians, 0 = 12 o'clock, increasing clockwise
 * (x = cx + r*sin a, y = cy - r*cos a).
 */

export interface ArcOptions {
  /**
   * Angular padding between adjacent arcs, clamped per arc to half its sweep
   * so a tiny arc can never invert (codecov's guard). Converted to a
   * per-radius offset so the visual gap is constant at both edges.
   */
  padAngle?: number;
  /** Radius the pad is anchored at; defaults to sqrt(r0² + r1²) (d3's default). */
  padRadius?: number;
  /** Radial gap between rings, subtracted from the outer radius. Default 1. */
  ringGap?: number;
}

const TAU = 2 * Math.PI;
const EPSILON = 1e-6;

const px = (cx: number, r: number, a: number): number => round(cx + r * Math.sin(a));
const py = (cy: number, r: number, a: number): number => round(cy - r * Math.cos(a));
const round = (v: number): number => Math.round(v * 1000) / 1000;

/** Full ring (or disc when r0 = 0): two half-arcs per radius — a single 360° arc
 *  whose endpoint equals its start point is silently dropped by SVG (SVG 2 §9.5.1). */
function fullRing(cx: number, cy: number, r0: number, r1: number): string {
  const outer =
    `M ${px(cx, r1, 0)} ${py(cy, r1, 0)} ` +
    `A ${r1} ${r1} 0 1 1 ${px(cx, r1, Math.PI)} ${py(cy, r1, Math.PI)} ` +
    `A ${r1} ${r1} 0 1 1 ${px(cx, r1, 0)} ${py(cy, r1, 0)} Z`;
  if (r0 <= EPSILON) return outer;
  const inner =
    `M ${px(cx, r0, 0)} ${py(cy, r0, 0)} ` +
    `A ${r0} ${r0} 0 1 0 ${px(cx, r0, Math.PI)} ${py(cy, r0, Math.PI)} ` +
    `A ${r0} ${r0} 0 1 0 ${px(cx, r0, 0)} ${py(cy, r0, 0)} Z`;
  // Opposite winding on the inner ring cuts the hole under the default nonzero fill rule.
  return `${outer} ${inner}`;
}

export function arcPath(
  cx: number,
  cy: number,
  r0: number,
  r1: number,
  a0: number,
  a1: number,
  options: ArcOptions = {},
): string {
  const { padAngle = 0, ringGap = 1 } = options;
  const inner = Math.max(0, r0);
  // The ring gap must never invert a sub-gap-height ring; a zero-height ring draws nothing.
  const outer = Math.max(inner, r1 - ringGap);
  if (outer - inner <= EPSILON || a1 - a0 <= EPSILON) return '';

  if (a1 - a0 >= TAU - EPSILON) return fullRing(cx, cy, inner, outer);

  const ap = Math.min((a1 - a0) / 2, padAngle) / 2;
  const rp = ap > 0 ? options.padRadius ?? Math.sqrt(inner * inner + outer * outer) : 0;
  const padAt = (r: number): number =>
    r > EPSILON ? Math.asin(Math.min(1, (rp * Math.sin(ap)) / r)) : 0;

  const mid = (a0 + a1) / 2;
  const clampSpan = (a: number, b: number): [number, number] =>
    b > a ? [a, b] : [mid, mid + EPSILON];

  const [o0, o1] = clampSpan(a0 + padAt(outer), a1 - padAt(outer));
  const largeOuter = o1 - o0 > Math.PI ? 1 : 0;
  const head =
    `M ${px(cx, outer, o0)} ${py(cy, outer, o0)} ` +
    `A ${outer} ${outer} 0 ${largeOuter} 1 ${px(cx, outer, o1)} ${py(cy, outer, o1)}`;

  if (inner <= EPSILON) return `${head} L ${round(cx)} ${round(cy)} Z`;

  const [i0, i1] = clampSpan(a0 + padAt(inner), a1 - padAt(inner));
  const largeInner = i1 - i0 > Math.PI ? 1 : 0;
  return (
    `${head} L ${px(cx, inner, i1)} ${py(cy, inner, i1)} ` +
    `A ${inner} ${inner} 0 ${largeInner} 0 ${px(cx, inner, i0)} ${py(cy, inner, i0)} Z`
  );
}

/**
 * Sunburst label placement: translate to the arc's radial midpoint and rotate
 * to read along the radius, flipping on the lower half so text is never
 * upside-down (Observable's transform).
 */
export function arcLabelTransform(x0: number, x1: number, rMid: number): string {
  const degrees = (((x0 + x1) / 2) * 360) % 360;
  return `rotate(${round(degrees - 90)}) translate(${round(rMid)},0) rotate(${degrees < 180 ? 0 : 180})`;
}

/** Observable's area threshold: label only arcs whose (rings × sweep-fraction) area clears it. */
export function arcLabelVisible(x0: number, x1: number, rings: number, minArea = 0.03): boolean {
  return rings * (x1 - x0) > minArea;
}
