import { DOCUMENT } from '@angular/common';
import { Component, ContentChildren, ElementRef, forwardRef, Host, Inject, Input, OnDestroy, Optional, QueryList, SkipSelf, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable, Subject, takeUntil } from 'rxjs';
import { BsNavbarComponent } from '../navbar/navbar.component';
import { BsNavbarItemComponent } from '../navbar-item/navbar-item.component';

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
    private element: ElementRef<HTMLElement>,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.parentDropdown = parentDropdown;
    this.navbarItem = navbarItem;

    this.isVisible$.pipe(takeUntil(this.destroyed$)).subscribe((isVisible) => {
      if (isVisible) {
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
      } else {
        return maxHeight;
      }
    }));
  }

  @Input() public autoclose = true;
  navbarItem: BsNavbarItemComponent;
  parentDropdown: BsNavbarDropdownComponent;
  private destroyed$ = new Subject();
  @ViewChild('dd') dropdownElement!: ElementRef<HTMLDivElement>;
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
