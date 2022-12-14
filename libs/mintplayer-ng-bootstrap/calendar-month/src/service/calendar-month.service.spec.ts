import { TestBed } from '@angular/core/testing';

import { BsCalendarMonthService } from './calendar-month.service';

describe('CalendarMonthService', () => {
  let service: BsCalendarMonthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BsCalendarMonthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
