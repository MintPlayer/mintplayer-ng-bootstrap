import { InjectionToken } from '@angular/core';
import type { BsNavigationLockService } from '../service/navigation-lock.service';

export const BS_NAVIGATION_LOCK_SERVICE = new InjectionToken<BsNavigationLockService>('BsNavigationLockService');
