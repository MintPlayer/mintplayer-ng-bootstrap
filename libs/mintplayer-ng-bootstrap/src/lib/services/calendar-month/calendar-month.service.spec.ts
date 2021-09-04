import { TestBed } from '@angular/core/testing';

import { CalendarMonthService } from './calendar-month.service';

describe('CalendarMonthService', () => {
  let service: CalendarMonthService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CalendarMonthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
