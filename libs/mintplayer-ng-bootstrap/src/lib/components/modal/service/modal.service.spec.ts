import { TestBed } from '@angular/core/testing';

import { BsModalService } from './modal.service';

describe('BsModalService', () => {
  let service: BsModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BsModalService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
