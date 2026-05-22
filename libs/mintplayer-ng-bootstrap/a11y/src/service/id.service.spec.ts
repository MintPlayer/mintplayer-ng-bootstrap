import { TestBed } from '@angular/core/testing';

import { BsIdService } from './id.service';

describe('BsIdService', () => {
  let service: BsIdService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BsIdService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('returns prefix-1 on the first call and increments on each subsequent call', () => {
    expect(service.next('bs-dropdown')).toBe('bs-dropdown-1');
    expect(service.next('bs-dropdown')).toBe('bs-dropdown-2');
    expect(service.next('bs-dropdown')).toBe('bs-dropdown-3');
  });

  it('shares a single counter across prefixes so every generated id is globally unique', () => {
    expect(service.next('foo')).toBe('foo-1');
    expect(service.next('bar')).toBe('bar-2');
    expect(service.next('foo')).toBe('foo-3');
  });

  it('starts at 1 in a fresh injector (no leakage across configureTestingModule resets)', () => {
    expect(service.next('first')).toBe('first-1');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(BsIdService);

    expect(fresh.next('first')).toBe('first-1');
  });
});
