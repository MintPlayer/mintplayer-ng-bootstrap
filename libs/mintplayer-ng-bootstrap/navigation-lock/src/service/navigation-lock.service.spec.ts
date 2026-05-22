import { vi } from 'vitest';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withRouterConfig } from '@angular/router';
import { Observable, of, Subject } from 'rxjs';
import { BsNavigationLockService } from './navigation-lock.service';
import { BsNavigationLockHandle } from './navigation-lock-handle';
function makeHandle(
  partial: Partial<BsNavigationLockHandle> & Pick<BsNavigationLockHandle, 'requestCanExit'>,
): BsNavigationLockHandle {
  return {
    exitMessage: () => undefined,
    ...partial,
  };
}

function makeBeforeUnloadEvent(): BeforeUnloadEvent {
  // jsdom exposes BeforeUnloadEvent's interface but its constructor is illegal.
  // A regular Event with the right type is enough for our handler — we just
  // need preventDefault() and a writable returnValue.
  const ev = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
  vi.spyOn(ev, 'preventDefault');
  return ev;
}

describe('BsNavigationLockService', () => {
  describe('beforeunload', () => {
    let service: BsNavigationLockService;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        providers: [
          provideRouter([], withRouterConfig({ canceledNavigationResolution: 'computed' })),
        ],
      }).compileComponents();
      service = TestBed.inject(BsNavigationLockService);
    });

    it('does not preventDefault when all locks return sync true', () => {
      service.register(makeHandle({ requestCanExit: () => true }));
      service.register(makeHandle({ requestCanExit: () => true }));

      const ev = makeBeforeUnloadEvent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).onBeforeUnload(ev);
      expect(ev.preventDefault).not.toHaveBeenCalled();
    });

    it('calls preventDefault when any lock returns sync false', () => {
      service.register(makeHandle({ requestCanExit: () => true }));
      service.register(makeHandle({ requestCanExit: () => false }));

      const ev = makeBeforeUnloadEvent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).onBeforeUnload(ev);
      expect(ev.preventDefault).toHaveBeenCalled();
    });

    it('calls preventDefault when any lock returns a Promise (browser cannot await)', () => {
      service.register(makeHandle({ requestCanExit: () => Promise.resolve(true) }));

      const ev = makeBeforeUnloadEvent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).onBeforeUnload(ev);
      expect(ev.preventDefault).toHaveBeenCalled();
    });

    it('calls preventDefault when any lock returns an Observable (browser cannot await)', () => {
      service.register(makeHandle({ requestCanExit: () => of(true) }));

      const ev = makeBeforeUnloadEvent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).onBeforeUnload(ev);
      expect(ev.preventDefault).toHaveBeenCalled();
    });
  });

  describe('register / unregister', () => {
    let service: BsNavigationLockService;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        providers: [
          provideRouter([], withRouterConfig({ canceledNavigationResolution: 'computed' })),
        ],
      }).compileComponents();
      service = TestBed.inject(BsNavigationLockService);
    });

    it('an unregistered lock is not consulted on subsequent requestExit', async () => {
      const spy = vi.fn(() => false);
      const handle = makeHandle({ requestCanExit: spy });
      service.register(handle);
      service.unregister(handle);
      const result = await service.requestExit();
      expect(spy).not.toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });

  describe('requestExit', () => {
    let service: BsNavigationLockService;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        providers: [
          provideRouter([], withRouterConfig({ canceledNavigationResolution: 'computed' })),
        ],
      }).compileComponents();
      service = TestBed.inject(BsNavigationLockService);
    });

    it('resolves true when the registry is empty', async () => {
      await expect(service.requestExit()).resolves.toBe(true);
    });

    it('resolves true when all locks allow exit (mixed sync/Promise/Observable)', async () => {
      service.register(makeHandle({ requestCanExit: () => true }));
      service.register(makeHandle({ requestCanExit: () => Promise.resolve(true) }));
      service.register(makeHandle({ requestCanExit: () => of(true) }));
      await expect(service.requestExit()).resolves.toBe(true);
    });

    it('short-circuits on the first false', async () => {
      const laterSpy = vi.fn(() => true);
      service.register(makeHandle({ requestCanExit: () => Promise.resolve(false) }));
      service.register(makeHandle({ requestCanExit: laterSpy }));
      await expect(service.requestExit()).resolves.toBe(false);
      expect(laterSpy).not.toHaveBeenCalled();
    });

    it('forwards the reason argument to each handle', async () => {
      const spyA = vi.fn().mockReturnValue(true);
      const spyB = vi.fn().mockReturnValue(true);
      service.register(makeHandle({ requestCanExit: spyA }));
      service.register(makeHandle({ requestCanExit: spyB }));
      await service.requestExit('logout');
      expect(spyA).toHaveBeenCalledWith('logout');
      expect(spyB).toHaveBeenCalledWith('logout');
    });

    it('handles an Observable that emits false', async () => {
      const subj = new Subject<boolean>();
      const obs = subj.asObservable() as Observable<boolean>;
      service.register(makeHandle({ requestCanExit: () => obs }));
      const promise = service.requestExit();
      subj.next(false);
      subj.complete();
      await expect(promise).resolves.toBe(false);
    });

    it('returns the same in-flight promise for re-entrant calls', async () => {
      const spy = vi.fn().mockImplementation(
        () => new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 10)),
      );
      service.register(makeHandle({ requestCanExit: spy }));

      const a = service.requestExit('a');
      const b = service.requestExit('b');
      expect(a).toBe(b); // same Promise

      const [ra, rb] = await Promise.all([a, b]);
      expect(ra).toBe(true);
      expect(rb).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1); // only the first reason was consulted
      expect(spy).toHaveBeenCalledWith('a');
    });

    it('starts a fresh request after the previous resolves', async () => {
      const spy = vi.fn().mockReturnValue(true);
      service.register(makeHandle({ requestCanExit: spy }));

      await service.requestExit();
      await service.requestExit();
      expect(spy).toHaveBeenCalledTimes(2);
    });

    // Regression: the first canMatch firing happens before any
    // `[bsNavigationLock]` directive has constructed and registered itself,
    // so `locks` is empty. A previous implementation set `pending` via
    // `this.pending = this.doRequestExit(reason)`, but `doRequestExit`'s
    // `try { ... } finally { this.pending = null }` ran to completion
    // synchronously when locks was empty — BEFORE the outer assignment line
    // executed. The outer assignment then re-set pending to the resolved
    // Promise, and every subsequent navigation short-circuited on the truthy
    // cache without consulting locks. This test ensures that path doesn't
    // poison pending again: after a sync-completing requestExit with no
    // locks, the next call MUST consult any locks registered in between.
    it('consults locks on next call after a sync-empty-locks request resolved', async () => {
      // 1st call: no locks → doRequestExit's body is fully synchronous.
      await service.requestExit();

      // Register a lock that would reject exit.
      const spy = vi.fn(() => false);
      service.register(makeHandle({ requestCanExit: spy }));

      // 2nd call MUST consult the lock and return its result.
      const result = await service.requestExit();
      expect(spy).toHaveBeenCalledTimes(1);
      expect(result).toBe(false);
    });
  });

  describe('SSR (server platform)', () => {
    it('does not attach a beforeunload listener', async () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      addSpy.mockClear();

      await TestBed.configureTestingModule({
        providers: [
          { provide: PLATFORM_ID, useValue: 'server' },
          provideRouter([], withRouterConfig({ canceledNavigationResolution: 'computed' })),
        ],
      }).compileComponents();
      TestBed.inject(BsNavigationLockService);

      const beforeUnloadCalls = addSpy.mock.calls.filter(
        (args) => args[0] === 'beforeunload',
      );
      expect(beforeUnloadCalls.length).toBe(0);
      addSpy.mockRestore();
    });
  });

  describe('dev-mode warning', () => {
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        /* swallow */
      });
    });

    afterEach(() => {
      warnSpy.mockRestore();
    });

    it('warns in dev mode when canceledNavigationResolution is not "computed"', async () => {
      await TestBed.configureTestingModule({
        providers: [
          // Default ('replace') — do NOT pass withRouterConfig.
          provideRouter([]),
        ],
      }).compileComponents();
      TestBed.inject(BsNavigationLockService);

      const navWarnings = warnSpy.mock.calls.filter(
        (args) =>
          typeof args[0] === 'string' &&
          args[0].includes('canceledNavigationResolution'),
      );
      expect(navWarnings.length).toBeGreaterThanOrEqual(1);
    });

    it('does not warn when canceledNavigationResolution is "computed"', async () => {
      await TestBed.configureTestingModule({
        providers: [
          provideRouter([], withRouterConfig({ canceledNavigationResolution: 'computed' })),
        ],
      }).compileComponents();
      TestBed.inject(BsNavigationLockService);

      const navWarnings = warnSpy.mock.calls.filter(
        (args) =>
          typeof args[0] === 'string' &&
          args[0].includes('canceledNavigationResolution'),
      );
      expect(navWarnings.length).toBe(0);
    });
  });
});
