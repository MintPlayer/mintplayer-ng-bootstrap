import { Directive, HostListener, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';


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
  constructor(private router: Router, private route: ActivatedRoute) {
    // console.log('initial navigation', this.route.snapshot.pathFromRoot.flatMap(ars => ars.url));
  }

  @Input() canExit?: boolean | (() => boolean) | Promise<boolean>;
  @Input() exitMessage?: string;

  async requestCanExit() {
    if (typeof this.canExit === 'undefined') {
      return true;
    } else if (typeof this.canExit === 'boolean') {
      return this.canExit;
    } else if (typeof this.canExit === 'function') {
      return this.canExit();
    } else {
      // It's a Promise
      return this.canExit;
    }
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
