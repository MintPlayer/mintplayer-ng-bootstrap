import { Component, Input, ContentChildren, QueryList, ElementRef, ViewChild, HostBinding } from '@angular/core';
import { BehaviorSubject, map, combineLatest, Observable } from 'rxjs';
import { BsSplitPanelComponent } from '../split-panel/split-panel.component';
import { Direction } from '../types/direction.type';

@Component({
  selector: 'bs-splitter',
  templateUrl: './splitter.component.html',
  styleUrls: ['./splitter.component.scss'],
})
export class BsSplitterComponent {

  constructor() {
    this.directionClass$ = this.orientation$.pipe(map((orientation) => {
      switch (orientation) {
        case 'horizontal': return 'flex-row';
        case 'vertical': return 'flex-column';
      }
    }));
    this.splitterClass$ = this.orientation$.pipe(map((orientation) => {
      switch (orientation) {
        case 'horizontal': return 'split-hor';
        case 'vertical': return 'split-ver';
      }
    }));
    this.widthStyles$ = combineLatest([this.orientation$, this.previewSizes$, this.panels$])
      .pipe(map(([orientation, previewSizes, panels]) => {
        switch (orientation) {
          case 'horizontal':
            if (previewSizes) {
              return Array(panels.length).map((v, i) => {
                if (i < previewSizes.length) {
                  return previewSizes[i] + 'px';
                } else {
                  return '100%';
                }
              });
            } else {
              return Array(panels.length).map((v, i) => '100%');
            }
          case 'vertical':
            return null;
        }
      }));
    this.heightStyles$ =  combineLatest([this.orientation$, this.previewSizes$, this.panels$])
      .pipe(map(([orientation, previewSizes, panels]) => {
        switch (orientation) {
          case 'horizontal':
            return null;
          case 'vertical':
            if (previewSizes) {
              return Array(panels.length).map((v, i) => {
                if (i < previewSizes.length) {
                  return previewSizes[i] + 'px';
                } else {
                  return '100%';
                }
              });
            } else {
              return Array(panels.length).map((v, i) => '100%');
            }
        }
      }));
  }

  //#region Orientation
  orientation$ = new BehaviorSubject<Direction>('horizontal');
  public get orientation() {
    return this.orientation$.value;
  }
  @Input() public set orientation(value: Direction) {
    this.orientation$.next(value);
  }
  //#endregion

  previewSizes$ = new BehaviorSubject<number[] | null>(null);

  panels$ = new BehaviorSubject<BsSplitPanelComponent[]>([]);
  @ContentChildren(BsSplitPanelComponent) set panels(value: QueryList<BsSplitPanelComponent>) {
    this.panels$.next(value.toArray());
  }
  
  @HostBinding('class.w-100')
  @HostBinding('class.h-100')
  @HostBinding('class.d-flex')
  classes = true;

  directionClass$: Observable<string>;
  splitterClass$: Observable<string>;
  widthStyles$: Observable<string[] | null>;
  heightStyles$: Observable<string[] | null>;

  startResize(ev: MouseEvent) {
    ev.preventDefault();
  }
}
