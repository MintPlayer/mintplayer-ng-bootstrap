import { MonthNamePipe } from './month-name.pipe';

describe('MonthNamePipe', () => {
  it('create an instance', () => {
    const pipe = new MonthNamePipe();
    expect(pipe).toBeTruthy();
  });
});
