import { BsMonthNamePipe } from './month-name.pipe';

describe('BsMonthNamePipe', () => {
  const pipe = new BsMonthNamePipe();

  it('is the long month name in the default locale', () => {
    const date = new Date(2026, 2, 15);
    expect(pipe.transform(date)).toBe(date.toLocaleString('default', { month: 'long' }));
    expect(pipe.transform(date).length).toBeGreaterThan(2);
  });

  it('is empty without a date', () => {
    expect(pipe.transform(null)).toBe('');
  });
});
