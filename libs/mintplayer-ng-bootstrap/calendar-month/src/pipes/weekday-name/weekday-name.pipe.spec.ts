import { BsWeekdayNamePipe } from './weekday-name.pipe';

describe('WeekdayNamePipe', () => {
  it('create an instance', () => {
    const pipe = new BsWeekdayNamePipe();
    expect(pipe).toBeTruthy();
  });
});
