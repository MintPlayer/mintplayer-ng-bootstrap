import { Injectable, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, NavigationStart, NavigationCancel, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { filter } from 'rxjs';
import type { BsNavigationLockDirective } from '../directive/navigation-lock.directive';

interface NavigationState {
  id: number;
  url: string;
  trigger: 'imperative' | 'popstate' | 'hashchange';
}

@Injectable()
export class BsNavigationLockService {
  private router = inject(Router);
  private location = inject(Location);
  private destroy = inject(DestroyRef);

  // Track registered navigation locks
  private activeLocks = signal<Set<BsNavigationLockDirective>>(new Set());

  // Track navigation state for history restoration
  private pendingNavigation: NavigationState | null = null;
  private savedUrl: string = '';
  private isRestoringHistory = false;

  constructor() {
    this.savedUrl = this.router.url;
    this.subscribeToRouterEvents();
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

  private subscribeToRouterEvents(): void {
    // Track NavigationStart to capture navigation details
    this.router.events.pipe(
      filter((event): event is NavigationStart => event instanceof NavigationStart),
      takeUntilDestroyed(this.destroy)
    ).subscribe(event => {
      if (!this.isRestoringHistory) {
        this.pendingNavigation = {
          id: event.id,
          url: event.url,
          trigger: event.navigationTrigger ?? 'imperative'
        };
      }
    });

    // Handle NavigationCancel - restore history if needed
    this.router.events.pipe(
      filter((event): event is NavigationCancel => event instanceof NavigationCancel),
      takeUntilDestroyed(this.destroy)
    ).subscribe(event => {
      if (this.pendingNavigation?.trigger === 'popstate' && this.pendingNavigation.id === event.id && !this.isRestoringHistory) {
        // Navigation was cancelled and it was a popstate navigation
        // Restore the browser history to the correct position
        this.restoreHistoryPosition();
      }
      this.pendingNavigation = null;
    });

    // Update saved URL on successful navigation
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this.destroy)
    ).subscribe(event => {
      this.savedUrl = event.urlAfterRedirects;
      this.pendingNavigation = null;
    });
  }

  private restoreHistoryPosition(): void {
    // Push current state back to history to restore position
    // Use history.pushState to add a new entry that matches the saved URL
    this.isRestoringHistory = true;

    // Use Location service to maintain consistency with Angular's router
    this.location.go(this.savedUrl);

    // Reset the flag after the navigation completes
    setTimeout(() => {
      this.isRestoringHistory = false;
    }, 0);
  }
}
