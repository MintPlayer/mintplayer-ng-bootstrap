import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { bsNavigationLockGuard } from './navigation-lock.guard';
import { BsNavigationLockService } from '../service/navigation-lock.service';

function runGuard(): boolean | Promise<boolean> | unknown {
  return TestBed.runInInjectionContext(() =>
    bsNavigationLockGuard(
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
    ),
  );
}

describe('bsNavigationLockGuard', () => {
  it('resolves true when the service has an empty registry', async () => {
    const service: Partial<BsNavigationLockService> = {
      requestExit: vi.fn().mockResolvedValue(true),
    };
    await TestBed.configureTestingModule({
      providers: [{ provide: BsNavigationLockService, useValue: service }],
    }).compileComponents();

    await expect(runGuard()).resolves.toBe(true);
    expect(service.requestExit).toHaveBeenCalled();
  });

  it('resolves true when all locks allow exit (mixed shapes via service)', async () => {
    const service: Partial<BsNavigationLockService> = {
      requestExit: vi.fn().mockResolvedValue(true),
    };
    await TestBed.configureTestingModule({
      providers: [{ provide: BsNavigationLockService, useValue: service }],
    }).compileComponents();

    await expect(runGuard()).resolves.toBe(true);
  });

  it('resolves false when any lock blocks', async () => {
    const service: Partial<BsNavigationLockService> = {
      requestExit: vi.fn().mockResolvedValue(false),
    };
    await TestBed.configureTestingModule({
      providers: [{ provide: BsNavigationLockService, useValue: service }],
    }).compileComponents();

    await expect(runGuard()).resolves.toBe(false);
  });

  it('returns the same result regardless of trigger (no popstate special-casing)', async () => {
    const service: Partial<BsNavigationLockService> = {
      requestExit: vi.fn().mockResolvedValue(false),
    };
    await TestBed.configureTestingModule({
      providers: [{ provide: BsNavigationLockService, useValue: service }],
    }).compileComponents();

    // The guard takes no trigger argument — sanity check the same call returns
    // the same shape both times.
    const a = await runGuard();
    const b = await runGuard();
    expect(a).toBe(false);
    expect(b).toBe(false);
    expect(service.requestExit).toHaveBeenCalledTimes(2);
  });
});
