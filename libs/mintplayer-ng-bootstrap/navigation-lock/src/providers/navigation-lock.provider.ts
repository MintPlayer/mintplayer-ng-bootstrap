import { Provider, ENVIRONMENT_INITIALIZER, inject } from '@angular/core';
import { Router, Route, Routes, RouteConfigLoadEnd, CanDeactivateFn } from '@angular/router';
import { filter } from 'rxjs';
import { BsNavigationLockService } from '../service/navigation-lock.service';

const GUARD_APPLIED = Symbol('navigationLockGuardApplied');

function createGuardAndAdder(service: BsNavigationLockService) {
  const guard: CanDeactivateFn<unknown> = async () => {
    console.log('Guard called, hasActiveLocks:', service.hasActiveLocks());
    if (service.hasActiveLocks()) {
      const result = await service.checkAllLocks();
      console.log('checkAllLocks result:', result);
      return result;
    }
    return true;
  };

  function addGuardToRoute(route: Route): void {
    // Skip if already processed
    if ((route as any)[GUARD_APPLIED]) {
      return;
    }

    // Mark as processed
    (route as any)[GUARD_APPLIED] = true;

    // Add guard to this route
    if (!route.canDeactivate) {
      route.canDeactivate = [];
    }
    route.canDeactivate.push(guard);

    // Recursively add to children
    if (route.children) {
      addGuardToRoutes(route.children);
    }
  }

  function addGuardToRoutes(routes: Routes): void {
    for (const route of routes) {
      addGuardToRoute(route);
    }
  }

  return { addGuardToRoute, addGuardToRoutes };
}

export function provideNavigationLock(): Provider[] {
  return [
    // Initialize and patch routes
    {
      provide: ENVIRONMENT_INITIALIZER,
      useFactory: () => {
        return () => {
          // Get the singleton service instance
          const service = inject(BsNavigationLockService);
          const router = inject(Router);

          console.log('provideNavigationLock initializing');

          // Create the guard adder with the service reference
          const { addGuardToRoute, addGuardToRoutes } = createGuardAndAdder(service);

          // Patch all existing routes with the navigation lock guard
          addGuardToRoutes(router.config);
          console.log('Initial routes patched');

          // Patch lazy-loaded routes when they load
          router.events.pipe(
            filter((event): event is RouteConfigLoadEnd => event instanceof RouteConfigLoadEnd)
          ).subscribe(event => {
            // Add guard to the route that just loaded
            addGuardToRoute(event.route);

            // Also check for _loadedRoutes (for loadChildren)
            const loadedRoutes = (event.route as any)._loadedRoutes;
            if (loadedRoutes) {
              addGuardToRoutes(loadedRoutes);
            }

            console.log('Route patched:', event.route.path, 'hasGuard:', !!(event.route.canDeactivate?.length));
          });
        };
      },
      multi: true
    }
  ];
}
