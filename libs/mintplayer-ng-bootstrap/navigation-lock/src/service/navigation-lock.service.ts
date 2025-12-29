import { Injectable, DestroyRef, inject, signal, NgZone } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, NavigationStart, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { filter } from 'rxjs';
import type { BsNavigationLockDirective } from '../directive/navigation-lock.directive';

@Injectable()
export class BsNavigationLockService {
  private router = inject(Router);
  private location = inject(Location);
  private destroy = inject(DestroyRef);
  private ngZone = inject(NgZone);

  // Track registered navigation locks
  private activeLocks = signal<Set<BsNavigationLockDirective>>(new Set());

  // Track state for navigation blocking
  private currentUrl: string = '';
  private isCheckingLocks = false;
  private isNavigatingBack = false;

  constructor() {
    this.currentUrl = this.router.url;
    this.setupNavigationInterception();
  }

  register(lock: BsNavigationLockDirective): void {
    this.activeLocks.update(locks => {
      const newLocks = new Set(locks);
      newLocks.add(lock);
      return newLocks;
    });
  }

  unregister(lock: BsNavigationLockDirective): void {
    this.activeLocks.update(locks => {
      const newLocks = new Set(locks);
      newLocks.delete(lock);
      return newLocks;
    });
  }

  hasActiveLocks(): boolean {
    return this.activeLocks().size > 0;
  }

  async checkAllLocks(): Promise<boolean> {
    const locks = Array.from(this.activeLocks());
    for (const lock of locks) {
      const canExit = await lock.requestCanExit();
      if (!canExit) {
        return false;
      }
    }
    return true;
  }

  private setupNavigationInterception(): void {
    // Intercept NavigationStart to check locks before navigation completes
    this.router.events.pipe(
      filter((event): event is NavigationStart => event instanceof NavigationStart),
      takeUntilDestroyed(this.destroy)
    ).subscribe(async (event) => {
      // Skip if we're navigating back after a failed lock check
      if (this.isNavigatingBack) {
        return;
      }

      // Skip if we're already checking locks (prevent recursion)
      if (this.isCheckingLocks) {
        return;
      }

      // Skip if no active locks
      if (!this.hasActiveLocks()) {
        return;
      }

      // Check all locks
      this.isCheckingLocks = true;
      const canNavigate = await this.checkAllLocks();
      this.isCheckingLocks = false;

      if (!canNavigate) {
        // Navigation was blocked - restore to previous URL
        this.isNavigatingBack = true;

        // Use setTimeout to let the current navigation complete first,
        // then navigate back
        this.ngZone.run(() => {
          // For popstate navigation, we need to go forward in history
          // For imperative navigation, we navigate back to saved URL
          if (event.navigationTrigger === 'popstate') {
            // Browser back/forward was pressed - restore history position
            history.go(1);
          } else {
            // Programmatic navigation - go back to where we were
            this.router.navigateByUrl(this.currentUrl, { replaceUrl: true });
          }

          setTimeout(() => {
            this.isNavigatingBack = false;
          }, 50);
        });
      }
    });

    // Update currentUrl after successful navigation
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroy)
    ).subscribe(event => {
      if (!this.isNavigatingBack) {
        this.currentUrl = event.urlAfterRedirects;
      }
    });
  }
}
