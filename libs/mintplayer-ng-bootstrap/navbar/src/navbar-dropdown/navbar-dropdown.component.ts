import { DOCUMENT, isPlatformServer } from '@angular/common';
import { ChangeDetectionStrategy, Component, contentChildren, computed, DestroyRef, effect, ElementRef, forwardRef, inject, Injector, input, OnDestroy, PLATFORM_ID, signal, SkipSelf, viewChild } from '@angular/core';
import { ClickOutsideDirective } from '@mintplayer/ng-click-outside';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsNoNoscriptDirective } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsNavbarComponent } from '../navbar/navbar.component';
import { BsNavbarItemComponent } from '../navbar-item/navbar-item.component';
import { DomPortal } from '@angular/cdk/portal';
import { OverlayRef } from '@angular/cdk/overlay';

@Component({
  selector: 'bs-navbar-dropdown',
  templateUrl: './navbar-dropdown.component.html',
  styleUrls: ['./navbar-dropdown.component.scss'],
  imports: [BsHasOverlayComponent, BsNoNoscriptDirective, ClickOutsideDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsNavbarDropdownComponent implements OnDestroy {

  private navbar = inject(BsNavbarComponent);
  parentDropdown = inject(BsNavbarDropdownComponent, { skipSelf: true, optional: true });
  navbarItem = inject(forwardRef(() => BsNavbarItemComponent), { host: true });
  element = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  private isAttached = false;
  private isDestroyed = false;
  private domPortal?: DomPortal;
  private overlay?: OverlayRef;
  private pendingShowInOverlay: boolean | null = null;

  autoclose = input(true);
  readonly dropdownElement = viewChild.required<ElementRef<HTMLDivElement>>('dd');
  isBrowser = !isPlatformServer(this.platformId);

  isVisible = signal<boolean>(false);
  topPos = signal<number | null>(null);

  maxHeight = computed(() => {
    const topPos = this.topPos();
    const w: Window | null = this.document.defaultView;
    if (!topPos) {
      return null;
    } else if (w && this.dropdownElement()) {
      const style = w.getComputedStyle(this.dropdownElement().nativeElement);
      return `calc(100vh - ${topPos}px - ${style.getPropertyValue('padding-top')} - ${style.getPropertyValue('padding-bottom')})`;
    } else {
      return null;
    }
  });

  maxHeightOrNull = computed(() => {
    const maxHeight = this.maxHeight();
    const isSmallMode = this.navbar.isSmallMode();
    if (isSmallMode) {
      return null;
    } else if (isPlatformServer(this.platformId)) {
      return this.parentDropdown ? null : maxHeight;
    } else {
      return maxHeight;
    }
  });

  constructor() {
    effect(() => {
      const isVisible = this.isVisible();
      if (isVisible) {
        setTimeout(() => {
          try { this.overlay?.updatePosition(); }
          catch (ex) { }
        }, 20);
        this.topPos.set(this.element.nativeElement.offsetTop);
      } else {
        this.topPos.set(null);
      }
    });

    if (!!this.parentDropdown && this.isBrowser) {
      import('@angular/cdk/overlay').then(({ Overlay }) => {
        // Guard against accessing injector after component is destroyed
        if (this.isDestroyed) {
          return;
        }
        const overlayService = this.injector.get(Overlay);
        this.domPortal = new DomPortal(this.element);
        this.overlay = overlayService.create({
          positionStrategy: overlayService.position()
            .flexibleConnectedTo(this.navbarItem.element)
            .withPositions([
              { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: -9, offsetY: -9 }
            ])
        });

        // Apply pending showInOverlay state if it was set before overlay was ready
        // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        if (this.pendingShowInOverlay !== null) {
          const pending = this.pendingShowInOverlay;
          this.pendingShowInOverlay = null;
          setTimeout(() => {
            this.showInOverlay = pending;
          });
        }
      });
    }
  }

  ngOnDestroy() {
    this.isDestroyed = true;
  }

  public set showInOverlay(value: boolean) {
    if (this.overlay && this.domPortal) {
      if (value && !this.isAttached) {
        this.overlay.attach(this.domPortal);
        this.isAttached = true;
      }
      if (!value && this.isAttached) {
        this.overlay.detach();
        this.isAttached = false;
      }
    } else {
      // Store the value to apply once the overlay is ready
      this.pendingShowInOverlay = value;
    }
  }

  get elementsToExclude() {
    return [this.navbarItem.anchorTag].filter((a) => a).map((a) => <HTMLElement>a);
  }

  readonly childDropdowns = contentChildren<BsNavbarDropdownComponent>(forwardRef(() => BsNavbarDropdownComponent), { descendants: true });
}
