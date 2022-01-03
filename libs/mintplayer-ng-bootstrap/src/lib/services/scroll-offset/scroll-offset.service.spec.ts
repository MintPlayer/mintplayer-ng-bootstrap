import { TestBed } from '@angular/core/testing';

import { BsScrollOffsetService } from './scroll-offset.service';

describe('BsScrollOffsetService', () => {
  let service: BsScrollOffsetService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BsScrollOffsetService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
