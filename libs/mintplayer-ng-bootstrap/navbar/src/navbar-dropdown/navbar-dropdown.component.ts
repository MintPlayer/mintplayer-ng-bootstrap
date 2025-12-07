import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Component, ContentChildren, ElementRef, forwardRef, Host, Inject, Injector, Input, Optional, PLATFORM_ID, QueryList, SkipSelf, ViewChild, signal, computed, effect } from '@angular/core';
import { BsNavbarComponent } from '../navbar/navbar.component';
import { BsNavbarItemComponent } from '../navbar-item/navbar-item.component';
import { DomPortal } from '@angular/cdk/portal';
import { OverlayRef } from '@angular/cdk/overlay';

@Component({
  selector: 'bs-navbar-dropdown',
  templateUrl: './navbar-dropdown.component.html',
  styleUrls: ['./navbar-dropdown.component.scss'],
  standalone: false,
})
export class BsNavbarDropdownComponent {

  constructor(
    private navbar: BsNavbarComponent,
    @Inject(forwardRef(() => BsNavbarDropdownComponent)) @SkipSelf() @Host() @Optional() parentDropdown: BsNavbarDropdownComponent,
    @Host() @Inject(forwardRef(() => BsNavbarItemComponent)) navbarItem: BsNavbarItemComponent,
    public element: ElementRef<HTMLElement>,
    private injector: Injector,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.parentDropdown = parentDropdown;
    this.navbarItem = navbarItem;
    this.isBrowser = !isPlatformServer(platformId);

    effect(() => {
      const isVisible = this.isVisibleSignal();
      if (isVisible) {
        setTimeout(() => {
          try { this.overlay && this.overlay.updatePosition(); }
          catch (ex) { }
        }, 20);
        this.topPosSignal.set(this.element.nativeElement.offsetTop);
      } else {
        this.topPosSignal.set(null);
      }
    });

    this.maxHeight = computed(() => {
      const topPos = this.topPosSignal();
      const w: Window | null = this.document.defaultView;
      if (!topPos) {
        return null;
      } else if (w) {
        const style = w.getComputedStyle(this.dropdownElement.nativeElement);
        return `calc(100vh - ${topPos}px - ${style.getPropertyValue('padding-top')} - ${style.getPropertyValue('padding-bottom')})`;
      } else {
        return null;
      }
    });

    this.maxHeightOrNull = computed(() => {
      const maxHeight = this.maxHeight();
      const isSmallMode = this.navbar.isSmallMode();
      if (isSmallMode) {
        return null;
      } else if (isPlatformServer(platformId)) {
        // Javascript disabled
        // Only apply max-height to the top-dropdown
        return parentDropdown ? null : maxHeight;
      } else {
        // If javascript enabled
        return maxHeight;
      }
    });

    if (!!parentDropdown && this.isBrowser) {
      // Setup overlay
      import('@angular/cdk/overlay').then(({ OverlayModule, Overlay }) => {
        const overlayService = this.injector.get(Overlay);
        this.domPortal = new DomPortal(this.element);
        this.overlay = overlayService.create({
          positionStrategy: overlayService.position()
            .flexibleConnectedTo(this.navbarItem.element)
            .withPositions([
              { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: -9, offsetY: -9 }
            ])
        });

        // For some reason we have to trigger this from the BsDropdownItem
        // this.showInOverlay = true;
      });
    }

  }

  private isAttached = false;
  private domPortal?: DomPortal;
  private overlay?: OverlayRef;
  public set showInOverlay(value: boolean) {
    if (this.overlay && this.domPortal) {
      // if (value && !this.overlay.hasAttached()) {
      if (value && !this.isAttached) {
        this.overlay.attach(this.domPortal);
        this.isAttached = true;
      }
      if (!value && this.isAttached) {
        this.overlay.detach();
        this.isAttached = false;
      }
    }
  }

  @Input() public autoclose = true;
  navbarItem: BsNavbarItemComponent;
  parentDropdown: BsNavbarDropdownComponent;
  @ViewChild('dd') dropdownElement!: ElementRef<HTMLDivElement>;
  isBrowser = false;
  topPosSignal = signal<number | null>(null);
  maxHeight;
  maxHeightOrNull;

  //#region IsVisible
  isVisibleSignal = signal<boolean>(false);
  public get isVisible() {
    return this.isVisibleSignal();
  }
  public set isVisible(value: boolean) {
    this.isVisibleSignal.set(value);
  }
  //#endregion

  get elementsToExclude() {
    return [this.navbarItem.anchorTag].filter((a) => a).map((a) => <HTMLElement>a);
  }

  @ContentChildren(forwardRef(() => BsNavbarDropdownComponent), { descendants: true }) childDropdowns!: QueryList<BsNavbarDropdownComponent>;
}
