import { TestBed } from '@angular/core/testing';

import { BsTimelineService } from './timeline.service';

describe('BsTimelineService', () => {
  let service: BsTimelineService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BsTimelineService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
