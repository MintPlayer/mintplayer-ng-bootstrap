import { DestroyRef, Directive, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { take, Observable } from 'rxjs';


/**
 * Places a navigation lock on this page.
 *
 * Don't forget to add the following to your route:
 *
 * ```ts
 * canDeactivate: [BsNavigationLockGuard]
 * ```
 *
 * and implement the `BsHasNavigationLock` on the page:
 *
 * ```ts
 * ViewChild('navigationLock') navigationLock!: BsNavigationLockDirective;
 * ```
 *
 **/
@Directive({
  selector: '[bsNavigationLock]',
  standalone: false,
  exportAs: 'bsNavigationLock',
  host: {
    '(window:beforeunload)': 'onBeforeUnload($event)',
    '(window:unload)': 'onUnload($event)',
  },
})
export class BsNavigationLockDirective {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private destroy = inject(DestroyRef);

  readonly canExit = input<boolean | (() => boolean) | Observable<boolean> | undefined>(undefined);
  readonly exitMessage = input<string | undefined>(undefined);

  requestCanExit() {
    const canExit = this.canExit();
    return new Promise<boolean>((resolve, reject) => {
      if (typeof canExit === 'undefined') {
        resolve(true);
      } else if (typeof canExit === 'boolean') {
        resolve(canExit);
      } else if (typeof canExit === 'function') {
        const result = canExit();
        resolve(result);
      } else {
        canExit.pipe(take(1), takeUntilDestroyed(this.destroy))
          .subscribe((result) => resolve(result));
      }
    });
  }

  async onBeforeUnload(ev: BeforeUnloadEvent): Promise<string | undefined> {
    const canExit = await this.requestCanExit();
    if (!canExit) {
      ev.preventDefault();
      ev.returnValue = false;
      return 'Are you sure?';
    } else {
      return undefined;
    }
  }

  onUnload(ev: Event) {

  }
}
