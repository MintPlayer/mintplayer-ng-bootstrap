import { describe, expect, it } from 'vitest';
import { arcLabelTransform, arcLabelVisible, arcPath } from './arc';

const TAU = 2 * Math.PI;

/** All numbers in a path string, in order. */
const nums = (d: string): number[] => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
const commands = (d: string, letter: string): number => (d.match(new RegExp(letter, 'g')) ?? []).length;

describe('arcPath', () => {
  it('emits M, outer A (sweep 1), L, inner A (sweep 0), Z for a plain ring segment', () => {
    const d = arcPath(200, 200, 60, 120, 0, Math.PI / 2, { ringGap: 0 });
    expect(d).toMatch(/^M [\d.-]+ [\d.-]+ A 120 120 0 0 1 .+ L .+ A 60 60 0 0 0 .+ Z$/);
    // Starts at the outer radius, 12 o'clock: (200, 200-120).
    expect(nums(d).slice(0, 2)).toEqual([200, 80]);
    // Outer arc ends at 3 o'clock: (200+120, 200).
    const [ex, ey] = nums(d).slice(7, 9);
    expect(ex).toBeCloseTo(320, 3);
    expect(ey).toBeCloseTo(200, 3);
  });

  it('sets the large-arc flag once the sweep exceeds half a turn', () => {
    const small = arcPath(0, 0, 10, 20, 0, Math.PI * 0.9, { ringGap: 0 });
    const large = arcPath(0, 0, 10, 20, 0, Math.PI * 1.1, { ringGap: 0 });
    expect(small).toContain('A 20 20 0 0 1');
    expect(large).toContain('A 20 20 0 1 1');
  });

  it('collapses the root wedge (r0 = 0) to a line back to center', () => {
    const d = arcPath(200, 200, 0, 120, 0, 1, { ringGap: 0 });
    expect(d).toMatch(/L 200 200 Z$/);
    expect(commands(d, 'A')).toBe(1);
  });

  it('splits a full circle into two half-arcs per radius (SVG drops endpoint===start arcs)', () => {
    const d = arcPath(200, 200, 60, 120, 0, TAU);
    expect(commands(d, 'A')).toBe(4);
    expect(commands(d, 'M')).toBe(2);
    expect(d).not.toContain('NaN');
    // Inner subpath winds the opposite way (sweep 0) to cut the hole.
    expect(d).toMatch(/A 60 60 0 1 0/);
  });

  it('renders a full DISC (r0=0) as a single two-arc outer subpath', () => {
    const d = arcPath(200, 200, 0, 120, 0, TAU);
    expect(commands(d, 'A')).toBe(2);
    expect(commands(d, 'M')).toBe(1);
  });

  it('returns empty for zero sweep and zero outer radius', () => {
    expect(arcPath(0, 0, 10, 20, 1, 1)).toBe('');
    expect(arcPath(0, 0, 0, 0.5, 0, 1)).toBe('');
  });

  it('clamps the ring gap so a sub-gap ring cannot invert', () => {
    const d = arcPath(0, 0, 100, 100.5, 0, 1); // outer would be 99.5 < inner without the clamp
    expect(d).toBe(''); // outer clamps to inner -> zero-height ring -> nothing to draw
  });

  it('pad angle is clamped to half the sweep: a tiny arc never inverts', () => {
    const d = arcPath(200, 200, 60, 120, 0, 0.002, { padAngle: 0.005, ringGap: 0 });
    expect(d).not.toBe('');
    expect(d).not.toContain('NaN');
    // Outer span endpoints stay ordered (x of end > x of start near 12 o'clock going clockwise).
    const n = nums(d);
    expect(n[7]).toBeGreaterThanOrEqual(n[0]);
  });

  it('padding removes a larger angle at the inner radius than the outer (constant linear gap)', () => {
    // Recover angles from emitted points: a = atan2(x - cx, cy - y) in our 12-o'clock frame.
    const angleOf = (x: number, y: number) => Math.atan2(x, -y);
    const d = arcPath(0, 0, 40, 160, 0, Math.PI / 2, { padAngle: 0.02, ringGap: 0 });
    const n = nums(d);
    const outerStart = angleOf(n[0], n[1]);        // M point, outer radius
    const innerEnd = angleOf(n[9], n[10]);         // L point, inner radius
    const outerShift = outerStart - 0;             // pad eaten at the outer edge
    const innerShift = Math.PI / 2 - innerEnd;     // pad eaten at the inner edge
    expect(outerShift).toBeGreaterThan(0);
    expect(innerShift).toBeGreaterThan(outerShift * 2); // r ratio is 4x, asin scales ~linearly here
  });
});

describe('arc labels', () => {
  it('rotates to the radial midpoint and flips on the lower half', () => {
    expect(arcLabelTransform(0, 0.25, 90)).toBe('rotate(-45) translate(90,0) rotate(0)');
    // Midpoint at 270deg (0.75 of the sweep) is on the lower/left half -> flipped.
    expect(arcLabelTransform(0.7, 0.8, 90)).toBe('rotate(180) translate(90,0) rotate(180)');
  });

  it('applies the normalized-area threshold', () => {
    expect(arcLabelVisible(0, 0.05, 1)).toBe(true);   // 0.05 > 0.03
    expect(arcLabelVisible(0, 0.02, 1)).toBe(false);
    expect(arcLabelVisible(0, 0.02, 2)).toBe(true);   // thick span rescues a thin angle
    expect(arcLabelVisible(0, 0.05, 1, 0.06)).toBe(false);
  });
});
