import { describe, expect, it } from 'vitest';
import { connectRating } from './rating.core';

const inputs = {
  value: 0,
  maximum: 5,
  disabled: false,
  name: null,
  label: 'Rating',
  starLabel: (star: number, maximum: number) => `Rate ${star} out of ${maximum} stars`,
};

describe('rating', () => {
  it('is a named radiogroup; a consumer aria-label wins', () => {
    expect(connectRating(inputs, 0, 'r1').root).toEqual({ class: 'rating', role: 'radiogroup', 'aria-label': 'Rating', 'aria-disabled': null });
    expect(connectRating(inputs, 0, 'r1', 'Score').root['aria-label']).toBe('Score');
  });

  it('renders one native radio per star, named by the formatter, sharing one form name', () => {
    const { stars } = connectRating(inputs, 0, 'r1');
    expect(stars).toHaveLength(5);
    expect(stars.map((star) => star.input['type'])).toEqual(Array(5).fill('radio'));
    expect(stars.map((star) => star.input['name'])).toEqual(Array(5).fill('r1-rating'));
    expect(stars[2].input['aria-label']).toBe('Rate 3 out of 5 stars');
    expect(connectRating({ ...inputs, name: 'score' }, 0, 'r1').stars[0].input['name']).toBe('score');
  });

  it('checks exactly the picked star, in the server attribute and the live property', () => {
    const { stars } = connectRating(inputs, 3, 'r1');
    expect(stars.map((star) => star.checked)).toEqual([false, false, true, false, false]);
    expect(stars.map((star) => star.input['checked'])).toEqual([null, null, '', null, null]);
  });

  it('checks nothing at 0, so the first radio is the tab stop', () => {
    expect(connectRating(inputs, 0, 'r1').stars.some((star) => star.checked)).toBe(false);
  });

  it('disables every radio and states it on the group', () => {
    const view = connectRating({ ...inputs, disabled: true }, 2, 'r1');
    expect(view.root['aria-disabled']).toBe('true');
    expect(view.stars.every((star) => star.input['disabled'] === '')).toBe(true);
  });

  it('follows maximum', () => {
    expect(connectRating({ ...inputs, maximum: 10 }, 0, 'r1').stars).toHaveLength(10);
    expect(connectRating({ ...inputs, maximum: 10 }, 0, 'r1').stars[9].input['aria-label']).toBe('Rate 10 out of 10 stars');
  });
});
