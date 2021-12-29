import { TestBed } from '@angular/core/testing';

import { BsDropdownService } from './dropdown.service';

describe('DropdownService', () => {
  let service: BsDropdownService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BsDropdownService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
