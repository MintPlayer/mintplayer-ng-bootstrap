import { Directive, HostBinding, HostListener, Inject, Input, forwardRef, Optional } from '@angular/core';
import { Position } from '@mintplayer/ng-bootstrap';
import type { BsResizableComponent } from '../resizable/resizable.component';
import { ResizeAction } from '../interfaces/resize-action';
import { PointerData } from '../interfaces/pointer-data';
import { RESIZABLE } from '../providers/resizable.provider';

@Directive({
  selector: '[bsResizeGlyph]',
  standalone: false,
})
export class BsResizeGlyphDirective {

  // Can't use typed DI because of the `import type`
  private readonly resizable: BsResizableComponent;
  constructor(@Inject(RESIZABLE) resizable: any) {
    this.resizable = resizable;
  }

  @HostBinding('class') positions = '';
  @HostBinding('class.glyph') glyphClass = true;
  @HostBinding('class.active') activeClass = false;

  @Input() set bsResizeGlyph(value: Position[]) {
    this.positions = value.join(' ');
  }

  @HostListener('mousedown', ['$event']) onMouseDown(ev: MouseEvent) {
    ev.preventDefault();
    this.onPointerDown()
  }

  @HostListener('touchstart', ['$event']) onTouchStart(ev: TouchEvent) {
    ev.preventDefault();
    this.onPointerDown();
  }

  @HostListener('document:mousemove', ['$event']) onMouseMove(ev: MouseEvent) {
    this.onPointerMove({ clientX: ev.clientX, clientY: ev.clientY, preventDefault: () => ev.preventDefault() });
  }

  @HostListener('touchmove', ['$event']) onTouchMove(ev: TouchEvent) {
    if (ev.touches.length === 1) {
      this.onPointerMove({ clientX: ev.touches[0].clientX, clientY: ev.touches[0].clientY, preventDefault: () => ev.preventDefault() });
    }
  }

  @HostListener('document:mouseup', ['$event']) onMouseUp(ev: Event) {
    this.onPointerUp();
  }

  @HostListener('touchend', ['$event']) onTouchEnd(ev: Event) {
    this.onPointerUp();
  }

  onPointerDown() {
    let action: ResizeAction = {
      positioning: this.resizable.positioning
    };
    const rect = this.resizable.element.nativeElement.getBoundingClientRect();
    const styles = window.getComputedStyle(this.resizable.element.nativeElement);

    const marginLeft = (this.resizable.positioning === 'absolute') ? undefined : parseFloat(styles.marginLeft.slice(0, -2));
    const marginRight = (this.resizable.positioning === 'absolute') ? undefined : parseFloat(styles.marginRight.slice(0, -2));
    const marginTop = (this.resizable.positioning === 'absolute') ? undefined : parseFloat(styles.marginTop.slice(0, -2));
    const marginBottom = (this.resizable.positioning === 'absolute') ? undefined : parseFloat(styles.marginBottom.slice(0, -2));

    if (this.positions?.includes('start')) {
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
    if (this.positions?.includes('end')) {
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
    if (this.positions?.includes('top')) {
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
    if (this.positions?.includes('bottom')) {
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
    this.activeClass = true;
  }

  private isBusy = false;
  onPointerMove(ev: PointerData) {
    if (this.resizable.resizeAction && !this.isBusy) {
      ev.preventDefault();
      this.isBusy = true;
      const rct = this.resizable.element.nativeElement.getBoundingClientRect();
      if (this.resizable.resizeAction.start && this.positions?.includes('end')) {
        // Right glyph
        const x = (ev.clientX < rct.left + 10) ? rct.left + 10 : ev.clientX;
        switch (this.resizable.positioning) {
          case 'inline': {
            const initalMargin = this.resizable.marginRight ?? 0;
            this.resizable.marginRight = initalMargin - (x - rct.right);
          } break;
          case 'absolute': {
            this.resizable.width = x - rct.left;
          } break;
        }
      } else if (this.resizable.resizeAction.end && this.positions?.includes('start')) {
        // Left glyph
        const x = (ev.clientX > rct.right - 10) ? rct.right - 10 : ev.clientX;
        switch (this.resizable.positioning) {
          case 'inline': {
            const initalMargin = this.resizable.marginLeft ?? 0;
            this.resizable.marginLeft = initalMargin + x - rct.left;
          } break;
          case 'absolute': {
            this.resizable.left = x;
            this.resizable.width = this.resizable.resizeAction.end.edge - x;
          } break;
        }
      }

      if (this.resizable.resizeAction.top && this.positions?.includes('bottom')) {
        // Bottom glyph
        const y = (ev.clientY < rct.top + 10) ? rct.top + 10 : ev.clientY;
        switch (this.resizable.positioning) {
          case 'inline': {
            const initalMargin = this.resizable.marginBottom ?? 0;
            this.resizable.height = y - rct.top;
            this.resizable.marginBottom = initalMargin - (y - rct.bottom);
          } break;
          case 'absolute': {
            this.resizable.height = y - rct.top;
          } break;
        }
      } else if (this.resizable.resizeAction.bottom && this.positions?.includes('top')) {
        // Top glyph
        const y = (ev.clientY > rct.bottom - 10) ? rct.bottom - 10 : ev.clientY;
        switch (this.resizable.positioning) {
          case 'inline': {
            const initalMargin = this.resizable.marginTop ?? 0;
            this.resizable.height = rct.bottom - y;
            this.resizable.marginTop = initalMargin + y - rct.top;
          } break;
          case 'absolute': {
            this.resizable.top = y;
            this.resizable.height = this.resizable.resizeAction.bottom.edge - y;
          } break;
        }
      }
      this.isBusy = false;
    }
  }
  
  onPointerUp() {
    this.resizable.resizeAction = undefined;
    this.activeClass = false;
  }
}
