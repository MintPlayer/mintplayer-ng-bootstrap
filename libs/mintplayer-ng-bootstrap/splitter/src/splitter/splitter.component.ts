import { DOCUMENT } from '@angular/common';
import { Component, Input, ContentChildren, QueryList, ElementRef, HostListener, HostBinding, ViewChildren, Inject } from '@angular/core';
import { BehaviorSubject, map, combineLatest, Observable, take, tap } from 'rxjs';
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
      }))
      .pipe(tap(widthStyles => {
        console.log('widthStyles', {orientation: this.orientation$.value, widthStyles});
      }));
    this.heightStyles$ =  combineLatest([this.orientation$, this.previewSizes$, this.panels$])
      .pipe(map(([orientation, previewSizes, panels]) => {
        switch (orientation) {
          case 'horizontal':
            return null;
          case 'vertical':
            if (previewSizes) {
              console.log('test', [...Array(panels.length).keys()]);
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
      }))
      .pipe(tap(heightStyles => {
        console.log('heightStyles', {orientation: this.orientation$.value, heightStyles});
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

  operation: DragOperation | null = null;

  test(indexBefore: number, indexAfter: number) {
    if (this.orientation === 'horizontal') {
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

      console.log('sizes', sizes);
      this.previewSizes$.next(sizes);
      const operation = {
        operation: EDragOperation.resizeSplitter,
        startPosition: { x: 600, y: 600 },
        sizes,
        indexBefore,
        indexAfter,
      };

      // offsetX
      let current = 600;
      setInterval(() => {
        current += 5;
        const deltaX = current - operation.startPosition.x;
        const sx = Array.from(operation.sizes);
        sx[operation.indexBefore] = operation.sizes[operation.indexBefore] + deltaX;
        sx[operation.indexAfter] = operation.sizes[operation.indexAfter] - deltaX;
        this.previewSizes$.next(sx);
      }, 100)
    }
  }

  startResize(ev: MouseEvent, indexBefore: number, indexAfter: number) {
    ev.preventDefault();
    // this.test(indexBefore, indexAfter);
    if (typeof window !== 'undefined') {
      console.log('panels', this.splitPanels);
      this.orientation$.pipe(take(1)).subscribe((orientation) => {
        const sizes = this.splitPanels
          .map((sp) => {
            const styles = window.getComputedStyle(sp.nativeElement);
            switch (orientation) {
              case 'horizontal': return styles.width;
              case 'vertical': return styles.height;
            }
          })
          .map((size) => size.slice(0, -2))
          .map((size) => parseFloat(size));

        console.log('sizes', sizes);
        this.previewSizes$.next(sizes);
        this.operation = {
          operation: EDragOperation.resizeSplitter,
          startPosition: { x: ev.offsetX, y: ev.offsetY },
          sizes,
          indexBefore,
          indexAfter,
        };
      });
    }
  }

  isBusy = false;

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(ev: MouseEvent) {
    if (this.operation && !this.isBusy) {
      this.isBusy = true;
      switch (this.operation.operation) {
        case EDragOperation.resizeSplitter: {
          combineLatest([this.orientation$])
            .pipe(take(1))
            .subscribe(([orientation]) => {
              if (this.operation) {
                switch (orientation) {
                  case 'horizontal':
                    const deltaX = ev.offsetX - this.operation.startPosition.x;
                    const sx = Array.from(this.operation.sizes);
                    sx[this.operation.indexBefore] = this.operation.sizes[this.operation.indexBefore] + deltaX;
                    sx[this.operation.indexAfter] = this.operation.sizes[this.operation.indexAfter] - deltaX;
                    this.previewSizes$.next(sx);
                    // this.operation.sizes[this.operation.indexBefore] += deltaX;
                    // this.operation.sizes[this.operation.indexAfter] -= deltaX;
                    break;
                  case 'vertical':
                    const deltaY = ev.offsetY - this.operation.startPosition.y;
                    const sy = Array.from(this.operation.sizes);
                    sy[this.operation.indexBefore] = this.operation.sizes[this.operation.indexBefore] + deltaY;
                    sy[this.operation.indexAfter] = this.operation.sizes[this.operation.indexAfter] - deltaY;
                    this.previewSizes$.next(sy);
                    // this.operation.sizes[this.operation.indexBefore] += deltaY;
                    // this.operation.sizes[this.operation.indexAfter] -= deltaY;
                    break;
                }
                // this.previewSizes$.next(this.operation.sizes);
                // this.operation.startPosition = {
                //   x: ev.offsetX,
                //   y: ev.offsetY,
                // };
              }
          })
        } break;
      }
      this.isBusy = false;
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(ev: MouseEvent) {
    this.operation = null;
  }
}
