import { WeekdayNamePipe } from './weekday-name.pipe';

describe('WeekdayNamePipe', () => {
  it('create an instance', () => {
    const pipe = new WeekdayNamePipe();
    expect(pipe).toBeTruthy();
  });
});
