import { Component, HostListener, Input, OnDestroy } from '@angular/core';
import { BsNavbarComponent } from '../navbar/navbar.component';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { BehaviorSubject, combineLatest, debounceTime, filter, map, Observable, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'bs-navbar-nav',
  templateUrl: './navbar-nav.component.html',
  styleUrls: ['./navbar-nav.component.scss'],
  animations: [SlideUpDownAnimation]
})
export class BsNavbarNavComponent implements OnDestroy {

  constructor(bsNavbar: BsNavbarComponent) {
    this.bsNavbar = bsNavbar;
    this.showNavs$ = combineLatest([this.bsNavbar.isExpanded$, this.windowWidth$])
      .pipe(filter(([isExpanded, windowWidth]) => {
        return windowWidth !== null;
      }))
      .pipe(map(([isExpanded, windowWidth]) => {
        if (windowWidth === null) {
          throw 'windowWidth should not be null here';
        } else if (windowWidth >= 768) {
          return true;
        } else if (isExpanded) {
          return true;
        } else {
          return false;
        }
      }));

    this.windowWidth$
      .pipe(debounceTime(300), takeUntil(this.destroyed$))
      .subscribe(() => {
        this.isResizing$.next(false);
      });
    this.onWindowResize();
  }
  
  bsNavbar: BsNavbarComponent;
  collapse$ = new BehaviorSubject<boolean>(true);
  windowWidth$ = new BehaviorSubject<number | null>(null);
  showNavs$: Observable<boolean>;
  isResizing$ = new BehaviorSubject<boolean>(false);
  destroyed$ = new Subject();
  
  ngOnDestroy() {
    this.destroyed$.next(true);
  }
  
  //#region collapse
  @Input() public set collapse(value: boolean) {
    this.collapse$.next(value);
  }
  public get collapse() {
    return this.collapse$.value;
  }
  //#endregion

  @HostListener('window:resize')
  onWindowResize() {
    this.isResizing$.next(true);
    if (typeof window !== 'undefined') {
      this.windowWidth$.next(window.innerWidth);
    }
  }
}
