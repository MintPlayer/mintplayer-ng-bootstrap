import { TestBed } from '@angular/core/testing';

import { BsNavigationLockGuard } from './navigation-lock.guard';

describe('BsNavigationLockGuard', () => {
  let guard: BsNavigationLockGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    guard = TestBed.inject(BsNavigationLockGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
