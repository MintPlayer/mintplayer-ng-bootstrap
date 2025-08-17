import { DestroyRef, Directive, HostListener, Input, OnDestroy } from '@angular/core';
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
})
export class BsNavigationLockDirective {
  constructor(private router: Router, private route: ActivatedRoute, private destroy: DestroyRef) {
    // console.log('initial navigation', this.route.snapshot.pathFromRoot.flatMap(ars => ars.url));
    // combineLatest([this.route.fragment])
    //   .pipe(takeUntil(this.destroyed$))
    //   .subscribe((fragment) => {
    //     console.log('fragments', fragment);
    //   });

    // router.events.subscribe((ev) => {
    //   // if (ev instanceof RouterEvent) {
    //   //   (<RouterEvent>ev).
    //   // }
    //   // console.log('router event', ev);
    // });
  }

  @Input() canExit?: boolean | (() => boolean) | Observable<boolean>;
  @Input() exitMessage?: string;

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
