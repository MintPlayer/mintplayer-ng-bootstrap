import { Injectable, signal } from '@angular/core';
import type { BsNavigationLockDirective } from '../directive/navigation-lock.directive';

@Injectable({ providedIn: 'root' })
export class BsNavigationLockService {
  // Track registered navigation locks
  private activeLocks = signal<Set<BsNavigationLockDirective>>(new Set());

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
}
