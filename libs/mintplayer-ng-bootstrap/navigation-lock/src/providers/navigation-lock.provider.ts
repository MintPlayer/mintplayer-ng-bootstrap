import { Provider, ENVIRONMENT_INITIALIZER, inject } from '@angular/core';
import { BsNavigationLockService } from '../service/navigation-lock.service';
import { BS_NAVIGATION_LOCK_SERVICE } from '../tokens/navigation-lock.token';

export function provideNavigationLock(): Provider[] {
  return [
    // Provide the service
    {
      provide: BS_NAVIGATION_LOCK_SERVICE,
      useClass: BsNavigationLockService
    },
    // Initialize the service on app start to begin listening to router events
    {
      provide: ENVIRONMENT_INITIALIZER,
      useFactory: () => {
        return () => {
          // Inject service to initialize it
          inject(BS_NAVIGATION_LOCK_SERVICE);
        };
      },
      multi: true
    }
  ];
}
