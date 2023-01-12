import { Directive, HostListener, Input, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterEvent } from '@angular/router';
import { combineLatest, takeUntil, Subject, of } from 'rxjs';
import { isPromise } from 'util/types';

@Directive({
  selector: '[bsNavigationLock]',
  exportAs: 'bsNavigationLock'
})
export class BsNavigationLockDirective implements OnDestroy {
  constructor(private router: Router, private route: ActivatedRoute) {
    console.log('initial navigation', this.route.snapshot.pathFromRoot.flatMap(ars => ars.url));
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

  @Input() canExit?: boolean | (() => boolean) | Promise<boolean>;
  @Input() exitMessage?: string;

  requestCanExit() {
    console.log('requestCanExit');
    return new Promise<boolean>((resolve, reject) => {
      if (typeof this.canExit === 'undefined') {
        resolve(true);
      } else if (typeof this.canExit === 'boolean') {
        resolve(this.canExit);
      } else if (typeof this.canExit === 'function') {
        const result = this.canExit();
        resolve(result);
      } else {
        this.canExit.then((result) => resolve(result));
      }
    });

    // if (typeof this.canExit === 'undefined') {
    //   return new Promise<boolean>((resolve) => resolve(true));
    // } else if (typeof this.canExit === 'boolean') {
    //   const ce = this.canExit;
    //   return new Promise<boolean>((resolve) => resolve(ce));
    // } else if (typeof this.canExit === 'function') {
    //   const ce = this.canExit;
    //   return new Promise<boolean>((resolve, reject) => {
    //     const result = ce();
    //     resolve(result);
    //   });
    // } else {
    //   const ce = this.canExit
    //   return new Promise<boolean>((resolve, reject) => {
    //     ce.then((res) => resolve(res));
    //   });
    // }
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

  ngOnDestroy() {
    this.destroyed$.next(true);
  }

  destroyed$ = new Subject();
}
