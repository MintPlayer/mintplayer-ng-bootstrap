import { DestroyRef, Directive, HostListener, inject, Input, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { take, Observable } from 'rxjs';
import { BsNavigationLockService } from '../service/navigation-lock.service';


/**
 * Places a navigation lock on this page.
 *
 * ## Usage:
 *
 * 1. Add `provideNavigationLock()` to your app providers:
 * ```ts
 * // app.config.ts
 * import { provideNavigationLock } from '@mintplayer/ng-bootstrap/navigation-lock';
 *
 * export const config: ApplicationConfig = {
 *   providers: [
 *     provideNavigationLock(),
 *     // ... other providers
 *   ]
 * };
 * ```
 *
 * 2. Use the directive in your template:
 * ```html
 * <ng-container bsNavigationLock [canExit]="canExit"></ng-container>
 * ```
 **/
@Directive({
  selector: '[bsNavigationLock]',
  standalone: false,
  exportAs: 'bsNavigationLock',
})
export class BsNavigationLockDirective implements OnInit {
  private destroy = inject(DestroyRef);
  private navigationLockService = inject(BsNavigationLockService);

  @Input() canExit?: boolean | (() => boolean) | Observable<boolean>;
  @Input() exitMessage?: string;

  ngOnInit(): void {
    this.navigationLockService.register(this);

    this.destroy.onDestroy(() => {
      this.navigationLockService.unregister(this);
    });
  }

  requestCanExit() {
    return new Promise<boolean>((resolve, reject) => {
      if (typeof this.canExit === 'undefined') {
        resolve(true);
      } else if (typeof this.canExit === 'boolean') {
        resolve(this.canExit);
      } else if (typeof this.canExit === 'function') {
        const result = this.canExit();
        resolve(result);
      } else {
        this.canExit.pipe(take(1), takeUntilDestroyed(this.destroy))
          .subscribe((result) => resolve(result));
      }
    });
  }

  @HostListener('window:beforeunload', ['$event'])
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

  @HostListener('window:unload', ['$event'])
  onUnload(ev: Event) {

  }
}
