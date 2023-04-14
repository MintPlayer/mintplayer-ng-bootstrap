import { TestBed } from '@angular/core/testing';

import { BsDockService } from './dock.service';

describe('BsDockService', () => {
  let service: BsDockService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BsDockService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
