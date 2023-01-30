import { DOCUMENT, isPlatformServer } from '@angular/common';
import { Component, ContentChildren, ElementRef, forwardRef, Host, Inject, Injector, Input, OnDestroy, Optional, PLATFORM_ID, QueryList, SkipSelf, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable, Subject, takeUntil } from 'rxjs';
import { BsNavbarComponent } from '../navbar/navbar.component';
import { BsNavbarItemComponent } from '../navbar-item/navbar-item.component';
import { DomPortal } from '@angular/cdk/portal';
import { OverlayRef } from '@angular/cdk/overlay';

@Component({
  selector: 'bs-navbar-dropdown',
  templateUrl: './navbar-dropdown.component.html',
  styleUrls: ['./navbar-dropdown.component.scss']
})
export class BsNavbarDropdownComponent implements OnDestroy {

  constructor(
    private navbar: BsNavbarComponent,
    @SkipSelf() @Host() @Optional() parentDropdown: BsNavbarDropdownComponent,
    @Host() @Inject(forwardRef(() => BsNavbarItemComponent)) navbarItem: BsNavbarItemComponent,
    public element: ElementRef<HTMLElement>,
    private injector: Injector,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.parentDropdown = parentDropdown;
    this.navbarItem = navbarItem;
    this.isBrowser = !isPlatformServer(platformId);

    this.isVisible$.pipe(takeUntil(this.destroyed$)).subscribe((isVisible) => {
      if (isVisible) {
        setTimeout(() => this.overlay && this.overlay.updatePosition(), 20);
        this.topPos$.next(this.element.nativeElement.offsetTop);
      } else {
        this.topPos$.next(null);
      }
    });

    this.maxHeight$ = this.topPos$.pipe(map((topPos) => {
      const w: Window | null = this.document.defaultView;
      if (!topPos) {
        return null;
      } else if (w) {
        const style = w.getComputedStyle(this.dropdownElement.nativeElement);
        return `calc(100vh - ${topPos}px - ${style.getPropertyValue('padding-top')} - ${style.getPropertyValue('padding-bottom')})`;
      } else {
        return null;
      }
    }));

    this.maxHeightOrNull$ = combineLatest([this.maxHeight$, this.navbar.isSmallMode$]).pipe(map(([maxHeight, isSmallMode]) => {
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
    }));

    if (!!parentDropdown) {
      // Setup overlay
      import('@angular/cdk/overlay').then(({ OverlayModule, Overlay }) => {
        const overlayService = this.injector.get(Overlay);
        return overlayService;
      }).then((overlayService) => {

        this.domPortal = new DomPortal(this.element);
        this.overlay = overlayService.create({
          positionStrategy: overlayService.position()
            .flexibleConnectedTo(this.navbarItem.element)
            .withPositions([
              { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: -7, offsetY: -9 }
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
      console.log('showInOverlay', value);
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
  private destroyed$ = new Subject();
  @ViewChild('dd') dropdownElement!: ElementRef<HTMLDivElement>;
  isBrowser = false;
  topPos$ = new BehaviorSubject<number | null>(null);
  maxHeight$: Observable<string | null>;
  maxHeightOrNull$: Observable<string | null>;

  //#region IsVisible
  isVisible$ = new BehaviorSubject<boolean>(false);
  public get isVisible() {
    return this.isVisible$.value;
  }
  public set isVisible(value: boolean) {
    this.isVisible$.next(value);
  }
  //#endregion

  get elementsToExclude() {
    return [this.navbarItem.anchorTag].filter((a) => a).map((a) => <HTMLElement>a);
  }

  @ContentChildren(forwardRef(() => BsNavbarDropdownComponent), { descendants: true }) childDropdowns!: QueryList<BsNavbarDropdownComponent>;

  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
