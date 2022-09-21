import { TestBed } from '@angular/core/testing';

import { BsToastService } from './toast.service';

describe('BsToastService', () => {
  let service: BsToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BsToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
