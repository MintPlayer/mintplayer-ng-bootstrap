import { AfterContentChecked, ChangeDetectorRef, DestroyRef, Directive, ElementRef, inject, input, Renderer2 } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';

// Here we extend the RouterLinkActiveDirective
// to have the "active" value for each <a> with a routerLink attribute
// Also handles fragment matching - links with fragments are only active when the fragment matches

@Directive({
  selector: 'a[routerLink]',
  standalone: true
})
export class NavbarRouterLinkActiveDirective extends RouterLinkActive implements AfterContentChecked {

  private _router = inject(Router);
  private _elementRef = inject(ElementRef);
  private _renderer = inject(Renderer2);
  private _destroyRef = inject(DestroyRef);

  readonly fragment = input<string | undefined>(undefined);

  constructor() {
    super(inject(Router), inject(ElementRef), inject(Renderer2), inject(ChangeDetectorRef));
    this.routerLinkActive = 'active';

    // Subscribe to navigation events to handle fragment-based active state
    this._router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(this._destroyRef)
    ).subscribe(() => {
      this.updateFragmentActiveState();
    });
  }

  ngAfterContentChecked(): void {
    // Update fragment state after Angular checks the content
    this.updateFragmentActiveState();
  }

  private updateFragmentActiveState(): void {
    // If this link has a fragment, we need custom handling
    const fragmentValue = this.fragment();
    if (fragmentValue) {
      const currentFragment = this._router.routerState.snapshot.root.fragment;
      const isFragmentMatch = currentFragment === fragmentValue;

      // If fragments don't match, remove the active class even if the route matches
      if (!isFragmentMatch) {
        this._renderer.removeClass(this._elementRef.nativeElement, 'active');
      }
    }
  }

}
