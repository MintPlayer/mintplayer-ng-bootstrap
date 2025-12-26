import { ChangeDetectionStrategy, Component, computed, ContentChildren, ElementRef, HostBinding, HostListener, input, QueryList, signal, ViewChildren } from '@angular/core';
import { DragOperation, EDragOperation } from '../interfaces/drag-operation';
import { Point } from '../interfaces/point';
import { BsSplitPanelComponent } from '../split-panel/split-panel.component';
import { Direction } from '../types/direction.type';

@Component({
  selector: 'bs-splitter',
  templateUrl: './splitter.component.html',
  styleUrls: ['./splitter.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsSplitterComponent {

  orientation = input<Direction>('horizontal');
  previewSizes = signal<number[] | null>(null);
  panels = signal<BsSplitPanelComponent[]>([]);
  isResizing = signal<boolean>(false);
  touchedDivider = signal<HTMLDivElement | null>(null);

  @ContentChildren(BsSplitPanelComponent) set panelsList(value: QueryList<BsSplitPanelComponent>) {
    this.panels.set(value.toArray());
  }
  @ViewChildren('splitPanel') splitPanels!: QueryList<ElementRef<HTMLDivElement>>;

  @HostBinding('class.w-100')
  @HostBinding('class.h-100')
  @HostBinding('class.d-flex')
  classes = true;

  directionClass = computed(() => {
    switch (this.orientation()) {
      case 'horizontal': return 'flex-row';
      case 'vertical': return 'flex-column';
    }
  });

  splitterClass = computed(() => {
    switch (this.orientation()) {
      case 'horizontal': return 'split-hor';
      case 'vertical': return 'split-ver';
    }
  });

  widthStyles = computed(() => {
    const orientation = this.orientation();
    const previewSizes = this.previewSizes();
    const panels = this.panels();
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
          return Array(panels.length).fill('100%');
        }
      case 'vertical':
        return null;
    }
  });

  heightStyles = computed(() => {
    const orientation = this.orientation();
    const previewSizes = this.previewSizes();
    const panels = this.panels();
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
          return Array(panels.length).fill('100%');
        }
    }
  });

  operation: DragOperation | null = null;

  computeSizes() {
    if (typeof window !== 'undefined') {
      const sizes = this.splitPanels
        .map((sp) => {
          const styles = window.getComputedStyle(sp.nativeElement);
          switch (this.orientation()) {
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

  startResizeMouse(ev: MouseEvent, indexBefore: number, indexAfter: number) {
    ev.preventDefault();
    this.startResize(indexBefore, indexAfter, { x: ev.clientX, y: ev.clientY });
  }

  startResizeTouch(ev: TouchEvent, indexBefore: number, indexAfter: number, divider: HTMLDivElement) {
    if (ev.cancelable) {
      ev.preventDefault();
      ev.stopPropagation();
      this.touchedDivider.set(divider);
      this.startResize(indexBefore, indexAfter, { x: ev.touches[0].clientX, y: ev.touches[0].clientY });
    }
  }

  private startResize(indexBefore: number, indexAfter: number, pt: Point) {
    const sizes = this.computeSizes();
    this.previewSizes.set(sizes);
    this.operation = {
      operation: EDragOperation.resizeSplitter,
      startPosition: pt,
      sizes,
      indexBefore,
      indexAfter,
    };

    this.isResizing.set(true);
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(ev: MouseEvent) {
    this.onResizeMove({ x: ev.clientX, y: ev.clientY });
  }

  onTouchMove(ev: TouchEvent) {
    if (this.operation) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    this.onResizeMove({ x: ev.touches[0].clientX, y: ev.touches[0].clientY });
  }

  onResizeMove(pt: Point) {
    if (this.operation) {
      switch (this.operation.operation) {
        case EDragOperation.resizeSplitter: {
          const orientation = this.orientation();
          switch (orientation) {
            case 'horizontal':
              const deltaX = pt.x - this.operation.startPosition.x;
              const sx = Array.from(this.operation.sizes);
              sx[this.operation.indexBefore] = this.operation.sizes[this.operation.indexBefore] + deltaX;
              sx[this.operation.indexAfter] = this.operation.sizes[this.operation.indexAfter] - deltaX;
              this.previewSizes.set(sx);
              break;
            case 'vertical':
              const deltaY = pt.y - this.operation.startPosition.y;
              const sy = Array.from(this.operation.sizes);
              sy[this.operation.indexBefore] = this.operation.sizes[this.operation.indexBefore] + deltaY;
              sy[this.operation.indexAfter] = this.operation.sizes[this.operation.indexAfter] - deltaY;
              this.previewSizes.set(sy);
              break;
          }
        } break;
      }
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(ev: MouseEvent) {
    this.onResizeUp();
  }

  onTouchEnd(ev: TouchEvent) {
    if (this.operation) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    this.touchedDivider.set(null);
    this.onResizeUp();
  }

  onResizeUp() {
    this.isResizing.set(false);
    this.operation = null;
  }
}
