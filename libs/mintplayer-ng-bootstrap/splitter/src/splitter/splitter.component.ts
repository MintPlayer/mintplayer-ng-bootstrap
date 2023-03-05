import { Component, Input, ContentChildren, QueryList, ElementRef, HostListener, HostBinding, ViewChildren } from '@angular/core';
import { BehaviorSubject, map, combineLatest, Observable, take } from 'rxjs';
import { DragOperation, EDragOperation } from '../interfaces/drag-operation';
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
              return [...Array(panels.length).keys()].map((v, i) => {
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
              return [...Array(panels.length).keys()].map((v, i) => {
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
  @ViewChildren('splitPanel') splitPanels!: QueryList<ElementRef<HTMLDivElement>>;
  
  @HostBinding('class.w-100')
  @HostBinding('class.h-100')
  @HostBinding('class.d-flex')
  classes = true;

  directionClass$: Observable<string>;
  splitterClass$: Observable<string>;
  widthStyles$: Observable<string[] | null>;
  heightStyles$: Observable<string[] | null>;
  isResizing$ = new BehaviorSubject<boolean>(false);
  operation: DragOperation | null = null;

  computeSizes() {
    if (typeof window !== 'undefined') {
      const sizes = this.splitPanels
        .map((sp) => {
          const styles = window.getComputedStyle(sp.nativeElement);
          switch (this.orientation) {
            case 'horizontal': return styles.width;
            case 'vertical': return styles.height;
          }
        })
        .map((size) => size.slice(0, -2))
        .map((size) => parseFloat(size));
      return sizes;
    } else {
      return this.splitPanels.map(p => 50);
    }
  }
  
  startResize(ev: MouseEvent, indexBefore: number, indexAfter: number) {
    ev.preventDefault();
    const sizes = this.computeSizes();
    this.previewSizes$.next(sizes);
    this.operation = {
      operation: EDragOperation.resizeSplitter,
      startPosition: { x: ev.clientX, y: ev.clientY },
      sizes,
      indexBefore,
      indexAfter,
    };

    this.isResizing$.next(true);
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(ev: MouseEvent) {
    if (this.operation) {
      switch (this.operation.operation) {
        case EDragOperation.resizeSplitter: {
          combineLatest([this.orientation$])
            .pipe(take(1))
            .subscribe(([orientation]) => {
              if (this.operation) {
                switch (orientation) {
                  case 'horizontal':
                    const deltaX = ev.clientX - this.operation.startPosition.x;
                    const sx = Array.from(this.operation.sizes);
                    sx[this.operation.indexBefore] = this.operation.sizes[this.operation.indexBefore] + deltaX;
                    sx[this.operation.indexAfter] = this.operation.sizes[this.operation.indexAfter] - deltaX;
                    this.previewSizes$.next(sx);
                    break;
                  case 'vertical':
                    const deltaY = ev.clientY - this.operation.startPosition.y;
                    const sy = Array.from(this.operation.sizes);
                    sy[this.operation.indexBefore] = this.operation.sizes[this.operation.indexBefore] + deltaY;
                    sy[this.operation.indexAfter] = this.operation.sizes[this.operation.indexAfter] - deltaY;
                    this.previewSizes$.next(sy);
                    break;
                }
              }
          })
        } break;
      }
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(ev: MouseEvent) {
    this.isResizing$.next(false);
    this.operation = null;
  }
}
