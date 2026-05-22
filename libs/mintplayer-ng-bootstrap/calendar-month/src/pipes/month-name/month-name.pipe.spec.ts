import { BsMonthNamePipe } from './month-name.pipe';

describe('MonthNamePipe', () => {
  it('create an instance', () => {
    const pipe = new BsMonthNamePipe();
    expect(pipe).toBeTruthy();
  });
});
