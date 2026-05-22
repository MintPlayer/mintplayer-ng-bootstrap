import { vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, withRouterConfig } from '@angular/router';
import { firstValueFrom, isObservable, Observable, of, Subject } from 'rxjs';
import { BsNavigationLockDirective } from './navigation-lock.directive';
import { BS_NAVIGATION_LOCK_CONFIRM, BsNavigationLockService } from '../service/navigation-lock.service';
type CanExitInput =
  | boolean
  | ((reason?: string) => boolean | Promise<boolean> | Observable<boolean>)
  | Observable<boolean>
  | undefined;

@Component({
  selector: 'navigation-lock-test',
  imports: [BsNavigationLockDirective],
  template: `
    <ng-container
      bsNavigationLock
      [canExit]="canExit()"
      [exitMessage]="exitMessage()"
      #navigationLock="bsNavigationLock">
    </ng-container>`,
})
class NavigationLockTestComponent {
  readonly canExit = signal<CanExitInput>(undefined);
  readonly exitMessage = signal<string | undefined>(undefined);
}

async function configureTestBed(): Promise<void> {
  await TestBed.configureTestingModule({
    providers: [
      provideRouter([], withRouterConfig({ canceledNavigationResolution: 'computed' })),
    ],
    imports: [NavigationLockTestComponent],
  }).compileComponents();
}

function createFixture(): ComponentFixture<NavigationLockTestComponent> {
  const fixture = TestBed.createComponent(NavigationLockTestComponent);
  fixture.detectChanges();
  return fixture;
}

function getDirective(fixture: ComponentFixture<NavigationLockTestComponent>): BsNavigationLockDirective {
  // Pull from registry: it's the only registered handle in this test.
  const service = TestBed.inject(BsNavigationLockService);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const set = (service as any).locks as Set<BsNavigationLockDirective>;
  return Array.from(set)[0];
}

describe('BsNavigationLockDirective', () => {
  describe('lifecycle', () => {
    beforeEach(async () => {
      await configureTestBed();
    });

    it('registers exactly once on creation, unregisters exactly once on destroy', () => {
      const service = TestBed.inject(BsNavigationLockService);
      const registerSpy = vi.spyOn(service, 'register');
      const unregisterSpy = vi.spyOn(service, 'unregister');

      const fixture = createFixture();
      expect(registerSpy).toHaveBeenCalledTimes(1);
      expect(unregisterSpy).not.toHaveBeenCalled();

      fixture.destroy();
      expect(unregisterSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('requestCanExit return shapes', () => {
    let fixture: ComponentFixture<NavigationLockTestComponent>;
    let directive: BsNavigationLockDirective;

    beforeEach(async () => {
      await configureTestBed();
      fixture = createFixture();
      directive = getDirective(fixture);
    });

    it('returns true (boolean) when canExit is undefined and no exitMessage', () => {
      const result = directive.requestCanExit();
      expect(result).toBe(true);
    });

    it('returns the bound boolean directly', async () => {
      fixture.componentInstance.canExit.set(false);
      fixture.detectChanges();
      const result = directive.requestCanExit();
      expect(result).toBe(false);

      fixture.componentInstance.canExit.set(true);
      fixture.detectChanges();
      expect(directive.requestCanExit()).toBe(true);
    });

    it('returns a sync function\'s boolean return', () => {
      fixture.componentInstance.canExit.set(() => false);
      fixture.detectChanges();
      const result = directive.requestCanExit();
      expect(result).toBe(false);
    });

    it('returns a Promise when the function returns a Promise', async () => {
      fixture.componentInstance.canExit.set(() => Promise.resolve(true));
      fixture.detectChanges();
      const result = directive.requestCanExit();
      expect(result).toBeInstanceOf(Promise);
      await expect(result).resolves.toBe(true);
    });

    it('returns an Observable when the function returns an Observable', async () => {
      fixture.componentInstance.canExit.set(() => of(true));
      fixture.detectChanges();
      const result = directive.requestCanExit();
      expect(isObservable(result)).toBe(true);
      await expect(firstValueFrom(result as Observable<boolean>)).resolves.toBe(true);
    });

    it('returns the input Observable directly when bound as Observable', async () => {
      const subj = new Subject<boolean>();
      fixture.componentInstance.canExit.set(subj.asObservable());
      fixture.detectChanges();
      const result = directive.requestCanExit();
      expect(isObservable(result)).toBe(true);
      const valuePromise = firstValueFrom(result as Observable<boolean>);
      subj.next(true);
      subj.complete();
      await expect(valuePromise).resolves.toBe(true);
    });
  });

  describe('reason propagation', () => {
    it('forwards reason to canExit function', async () => {
      await configureTestBed();
      const fixture = createFixture();
      const directive = getDirective(fixture);

      const spy = vi.fn((reason?: string) => reason === 'logout');
      fixture.componentInstance.canExit.set(spy);
      fixture.detectChanges();

      const result = directive.requestCanExit('logout');
      expect(spy).toHaveBeenCalledWith('logout');
      expect(result).toBe(true);
    });
  });

  describe('fallback path (BS_NAVIGATION_LOCK_CONFIRM)', () => {
    it('delegates to the injected confirm hook when canExit is undefined and exitMessage is set', async () => {
      const confirmStub = vi.fn().mockReturnValue(false);
      await TestBed.configureTestingModule({
        providers: [
          provideRouter([], withRouterConfig({ canceledNavigationResolution: 'computed' })),
          { provide: BS_NAVIGATION_LOCK_CONFIRM, useValue: confirmStub },
        ],
        imports: [NavigationLockTestComponent],
      }).compileComponents();

      const fixture = createFixture();
      fixture.componentInstance.exitMessage.set('msg');
      fixture.detectChanges();

      const directive = getDirective(fixture);
      const result = directive.requestCanExit();
      expect(result).toBeInstanceOf(Promise);
      expect(confirmStub).toHaveBeenCalledWith('msg');
      await expect(result).resolves.toBe(false);
    });
  });
});
