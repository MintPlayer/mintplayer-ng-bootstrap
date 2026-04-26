import { Directive, effect, inject, input, signal, forwardRef } from '@angular/core';
import { Position } from '@mintplayer/ng-bootstrap';
import type { BsResizableComponent } from '../resizable/resizable.component';
import { ResizeAction } from '../interfaces/resize-action';
import { PointerData } from '../interfaces/pointer-data';
import { RESIZABLE } from '../providers/resizable.provider';

@Directive({
  selector: '[bsResizeGlyph]',
  host: {
    '[class]': 'positions()',
    '[class.glyph]': 'true',
    '[class.active]': 'activeClass()',
    '(mousedown)': 'onMouseDown($event)',
    '(touchstart)': 'onTouchStart($event)',
    '(document:mousemove)': 'onMouseMove($event)',
    '(touchmove)': 'onTouchMove($event)',
    '(document:mouseup)': 'onMouseUp($event)',
    '(touchend)': 'onTouchEnd($event)',
  },
})
export class BsResizeGlyphDirective {

  // Can't use typed DI because of the `import type`
  private readonly resizable: BsResizableComponent = inject(RESIZABLE);

  constructor() {
    effect(() => {
      const value = this.bsResizeGlyph();
      this.positions.set(value.join(' '));
    });
  }

  positions = signal('');
  activeClass = signal(false);

  readonly bsResizeGlyph = input<Position[]>([]);

  onMouseDown(ev: MouseEvent) {
    ev.preventDefault();
    this.onPointerDown()
  }

  onTouchStart(ev: TouchEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.onPointerDown();
  }

  onMouseMove(ev: MouseEvent) {
    this.onPointerMove({ clientX: ev.clientX, clientY: ev.clientY, preventDefault: () => ev.preventDefault() });
  }

  onTouchMove(ev: TouchEvent) {
    if (ev.touches.length === 1) {
      ev.preventDefault();
      ev.stopPropagation();
      this.onPointerMove({ clientX: ev.touches[0].clientX, clientY: ev.touches[0].clientY, preventDefault: () => ev.preventDefault() });
    }
  }

  onMouseUp(ev: Event) {
    this.onPointerUp();
  }

  onTouchEnd(ev: TouchEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.onPointerUp();
  }

  onPointerDown() {
    let action: ResizeAction = {
      positioning: this.resizable.positioning()
    };
    const rect = this.resizable.element.nativeElement.getBoundingClientRect();
    const styles = window.getComputedStyle(this.resizable.element.nativeElement);

    const marginLeft = (this.resizable.positioning() === 'absolute') ? undefined : parseFloat(styles.marginLeft.slice(0, -2));
    const marginRight = (this.resizable.positioning() === 'absolute') ? undefined : parseFloat(styles.marginRight.slice(0, -2));
    const marginTop = (this.resizable.positioning() === 'absolute') ? undefined : parseFloat(styles.marginTop.slice(0, -2));
    const marginBottom = (this.resizable.positioning() === 'absolute') ? undefined : parseFloat(styles.marginBottom.slice(0, -2));


    if (this.positions()?.includes('start')) {
      action = {
        ...action,
        end: {
          edge: rect.right,
          size: rect.width,
          margin: marginRight,
          dragMargin: marginLeft
        },
      };
    }
    if (this.positions()?.includes('end')) {
      action = {
        ...action,
        start: {
          edge: rect.left,
          size: rect.width,
          margin: marginLeft,
          dragMargin: marginRight
        },
      };
    }
    if (this.positions()?.includes('top')) {
      action = {
        ...action,
        bottom: {
          edge: rect.bottom,
          size: rect.height,
          margin: marginBottom,
          dragMargin: marginTop
        },
      };
    }
    if (this.positions()?.includes('bottom')) {
      action = {
        ...action,
        top: {
          edge: rect.top,
          size: rect.height,
          margin: marginTop,
          dragMargin: marginBottom
        },
      };
    }

    this.resizable.resizeAction = action;
    this.activeClass.set(true);
  }

  private isBusy = false;
  onPointerMove(ev: PointerData) {
    if (this.resizable.resizeAction && !this.isBusy) {
      ev.preventDefault();
      this.isBusy = true;
      const action = this.resizable.resizeAction;
      // Note: the live bounding rect must NOT be used in the size/margin math.
      // Reading it per-frame creates a feedback loop when content inside the
      // host changes layout during the drag (e.g. a child component that
      // shows/hides items in response to width). Use the captured `action`
      // values from pointer-down — they're stable for the duration of the drag.

      if (action.start && this.positions()?.includes('end')) {
        // Right glyph — fixed left edge
        const initialLeft = action.start.edge;
        const initialRight = action.start.edge + action.start.size;
        const x = (ev.clientX < initialLeft + 10) ? initialLeft + 10 : ev.clientX;
        switch (this.resizable.positioning()) {
          case 'inline': {
            const initialMargin = action.start.dragMargin ?? 0;
            this.resizable.marginRight.set(initialMargin + (initialRight - x));
          } break;
          case 'absolute': {
            this.resizable.width.set(x - initialLeft);
          } break;
        }
      } else if (action.end && this.positions()?.includes('start')) {
        // Left glyph — fixed right edge
        const initialRight = action.end.edge;
        const initialLeft = action.end.edge - action.end.size;
        const x = (ev.clientX > initialRight - 10) ? initialRight - 10 : ev.clientX;
        switch (this.resizable.positioning()) {
          case 'inline': {
            const initialMargin = action.end.dragMargin ?? 0;
            this.resizable.marginLeft.set(initialMargin + (x - initialLeft));
          } break;
          case 'absolute': {
            this.resizable.left.set(x);
            this.resizable.width.set(initialRight - x);
          } break;
        }
      }

      if (action.top && this.positions()?.includes('bottom')) {
        // Bottom glyph — fixed top edge. action.top.edge = captured rect.top
        const initialTop = action.top.edge;
        const initialBottom = action.top.edge + action.top.size;
        const y = (ev.clientY < initialTop + 10) ? initialTop + 10 : ev.clientY;
        switch (this.resizable.positioning()) {
          case 'inline': {
            const initialMargin = action.top.dragMargin ?? 0;
            this.resizable.height.set(y - initialTop);
            this.resizable.marginBottom.set(initialMargin + (initialBottom - y));
          } break;
          case 'absolute': {
            this.resizable.height.set(y - initialTop);
          } break;
        }
      } else if (action.bottom && this.positions()?.includes('top')) {
        // Top glyph — fixed bottom edge. action.bottom.edge = captured rect.bottom
        const initialBottom = action.bottom.edge;
        const initialTop = action.bottom.edge - action.bottom.size;
        const y = (ev.clientY > initialBottom - 10) ? initialBottom - 10 : ev.clientY;
        switch (this.resizable.positioning()) {
          case 'inline': {
            const initialMargin = action.bottom.dragMargin ?? 0;
            this.resizable.height.set(initialBottom - y);
            this.resizable.marginTop.set(initialMargin + (y - initialTop));
          } break;
          case 'absolute': {
            this.resizable.top.set(y);
            this.resizable.height.set(initialBottom - y);
          } break;
        }
      }
      this.isBusy = false;
    }
  }
  
  onPointerUp() {
    this.resizable.resizeAction = undefined;
    this.activeClass.set(false);
  }
}
