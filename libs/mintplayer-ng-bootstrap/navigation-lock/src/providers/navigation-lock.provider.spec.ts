import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, ROUTER_CONFIGURATION, Router, withRouterConfig } from '@angular/router';
import { provideNavigationLock, provideNavigationLockRouter } from './navigation-lock.provider';
import { BS_NAVIGATION_LOCK_CONFIRM } from '../service/navigation-lock.service';

describe('provideNavigationLock', () => {
  it('returns EnvironmentProviders that TestBed accepts', async () => {
    const providers = provideNavigationLock();
    expect(providers).toBeDefined();
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([], withRouterConfig({ canceledNavigationResolution: 'computed' })),
        providers,
      ],
    }).compileComponents();
    expect(TestBed.inject(BS_NAVIGATION_LOCK_CONFIRM)).toBeDefined();
  });

  it('overrides BS_NAVIGATION_LOCK_CONFIRM when confirm is supplied', async () => {
    const customConfirm = vi.fn().mockReturnValue(true);
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([], withRouterConfig({ canceledNavigationResolution: 'computed' })),
        provideNavigationLock({ confirm: customConfirm }),
      ],
    }).compileComponents();

    const hook = TestBed.inject(BS_NAVIGATION_LOCK_CONFIRM);
    expect(hook).toBe(customConfirm);
  });

  it('leaves the default window.confirm-based hook in place when no confirm is supplied', async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([], withRouterConfig({ canceledNavigationResolution: 'computed' })),
        provideNavigationLock(),
      ],
    }).compileComponents();

    const hook = TestBed.inject(BS_NAVIGATION_LOCK_CONFIRM);
    expect(typeof hook).toBe('function');

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    try {
      const result = hook('hello');
      expect(confirmSpy).toHaveBeenCalledWith('hello');
      expect(result).toBe(false);
    } finally {
      confirmSpy.mockRestore();
    }
  });
});

describe('provideNavigationLockRouter', () => {
  it('sets canceledNavigationResolution to "computed"', async () => {
    await TestBed.configureTestingModule({
      providers: [provideNavigationLockRouter([])],
    }).compileComponents();

    const cfg = TestBed.inject(ROUTER_CONFIGURATION);
    expect(cfg.canceledNavigationResolution).toBe('computed');
  });

  it('wraps routes in a root canActivate entry with runGuardsAndResolvers:"always"', async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideNavigationLockRouter([
          { path: 'a', children: [{ path: 'b', children: [{ path: 'c', component: class {} }] }] },
        ]),
      ],
    }).compileComponents();

    const router = TestBed.inject(Router);
    const root = router.config[0];
    expect(root.path).toBe('');
    // canActivate fires on EVERY navigation under the wrapper (with
    // runGuardsAndResolvers: 'always'). canMatch would only exclude the route
    // from matching, not cancel the navigation — so canActivate is the right
    // guard for navigation-blocking semantics.
    expect(root.canActivate?.length).toBe(1);
    expect(root.runGuardsAndResolvers).toBe('always');
    expect(root.children?.[0]?.path).toBe('a');
  });

  it('forwards extra router features', async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideNavigationLockRouter([], withRouterConfig({ paramsInheritanceStrategy: 'always' })),
      ],
    }).compileComponents();

    const cfg = TestBed.inject(ROUTER_CONFIGURATION);
    expect(cfg.paramsInheritanceStrategy).toBe('always');
  });
});
