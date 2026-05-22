import { Injectable } from '@angular/core';
/**
 * App-wide unique ID generator for ARIA wiring (`aria-controls`,
 * `aria-labelledby`, `aria-activedescendant`, etc.).
 *
 * Why a service instead of `crypto.randomUUID()` or per-component counters:
 * IDs need to stay short and human-readable in DevTools, and per-component
 * counters collide when the same component is instantiated more than once on
 * a page (two `bs-dropdown`s would each assign `bs-dropdown-1`). The shared
 * counter guarantees uniqueness across the whole app without UUID noise.
 */
@Injectable({ providedIn: 'root' })
export class BsIdService {
  private counter = 0;

  /** Returns `${prefix}-N` where N monotonically increases for the lifetime of the app. */
  next(prefix: string): string {
    return `${prefix}-${++this.counter}`;
  }
}
