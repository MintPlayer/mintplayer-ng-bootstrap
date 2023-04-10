import { Directive, HostBinding, HostListener, Inject, Input, forwardRef, Optional } from '@angular/core';
import { Position } from '@mintplayer/ng-bootstrap';
import { BsResizableComponent } from '../resizable/resizable.component';
import { ResizeAction } from '../interfaces/resize-action';

@Directive({
  selector: '[bsResizeGlyph]'
})
export class BsResizeGlyphDirective {

  constructor(@Optional() @Inject(forwardRef(() => BsResizableComponent)) private resizable: BsResizableComponent) {}

  @HostBinding('class') positions = '';
  @HostBinding('class.glyph') glyphClass = true;

  @Input() set bsResizeGlyph(value: Position[]) {
    this.positions = value.join(' ');
  }

  @HostListener('mousedown', ['$event']) onMouseDown(ev: MouseEvent) {
    ev.preventDefault();
    let action: ResizeAction = {};
    const rect = this.resizable.element.nativeElement.getBoundingClientRect();
    const styles = window.getComputedStyle(this.resizable.element.nativeElement);

    const marginLeft = parseFloat(styles.marginLeft.slice(0, -2));
    const marginRight = parseFloat(styles.marginRight.slice(0, -2));
    const marginTop = parseFloat(styles.marginTop.slice(0, -2));
    const marginBottom = parseFloat(styles.marginBottom.slice(0, -2));

    // debugger;
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
    console.log('resize', action);
  }

  private isBusy = false;
  @HostListener('document:mousemove', ['$event']) onMouseMove(ev: MouseEvent) {
    if (this.resizable.resizeAction && !this.isBusy) {
      this.isBusy = true;
      const rct = this.resizable.element.nativeElement.getBoundingClientRect();
      // console.log('position', ev);
      if (this.resizable.resizeAction.start && this.positions?.includes('end')) {
        const x = ev.clientX;// - rct.left;
        const initalMargin = this.resizable.marginRight ?? 0;
        this.resizable.marginRight = initalMargin - (x - rct.right);
      } else if (this.resizable.resizeAction.end && this.positions?.includes('start')) {
        const initalMargin = this.resizable.marginLeft ?? 0;
        this.resizable.marginLeft = initalMargin + ev.clientX - rct.left;
      }

      if (this.resizable.resizeAction.top && this.positions?.includes('bottom')) {
        const initalMargin = this.resizable.marginBottom ?? 0;
        this.resizable.height = ev.clientY - rct.top;
        this.resizable.marginBottom = initalMargin - (ev.clientY - rct.bottom);
      } else if (this.resizable.resizeAction.bottom && this.positions?.includes('top')) {
        const initalMargin = this.resizable.marginTop ?? 0;
        this.resizable.height = rct.bottom - ev.clientY;
        this.resizable.marginTop = initalMargin + ev.clientY - rct.top;
      }
      this.isBusy = false;
    }
  }
  
  @HostListener('document:mouseup', ['$event']) onMouseUp(ev: Event) {
    this.resizable.resizeAction = undefined;
  }
}
