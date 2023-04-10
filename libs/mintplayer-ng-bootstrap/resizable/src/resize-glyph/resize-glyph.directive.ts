import { Directive, HostBinding, HostListener, Input } from '@angular/core';
import { Position } from '@mintplayer/ng-bootstrap';
import { BsResizableComponent } from '../resizable/resizable.component';
import { ResizeAction } from '../interfaces/resize-action';

@Directive({
  selector: '[bsResizeGlyph]'
})
export class BsResizeGlyphDirective {

  constructor(private resizable: BsResizableComponent) {}

  @HostBinding('class') positions: Position[] = [];
  @HostBinding('class.glyph') glyphClass = true;
  // @HostBinding('style.margin-left.px') marginLeft?: number;
  // @HostBinding('style.margin-right.px') marginRight?: number;
  // @HostBinding('style.margin-top.px') marginTop?: number;
  // @HostBinding('style.margin-bottom.px') marginBottom?: number;

  @Input() set bsResizeGlyph(value: Position[]) {
    this.positions = value;
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
    if (this.positions.includes('start')) {
      action = {
        ...action,
        end: {
          edge: rect.right,
          margin: marginRight,
          dragMargin: marginLeft
        },
      };
    }
    if (this.positions.includes('end')) {
      action = {
        ...action,
        start: {
          edge: rect.left,
          margin: marginLeft,
          dragMargin: marginRight
        },
      };
    }
    if (this.positions.includes('top')) {
      action = {
        ...action,
        bottom: {
          edge: rect.bottom,
          margin: marginBottom,
          dragMargin: marginTop
        },
      };
    }
    if (this.positions.includes('bottom')) {
      action = {
        ...action,
        top: {
          edge: rect.top,
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
      if (this.resizable.resizeAction.start && this.positions.includes('end')) {

      }
      this.isBusy = false;
    }
  }

  @HostListener('document:mouseup', ['$event']) onMouseUp(ev: Event) {
    this.resizable.resizeAction = undefined;
  }
}
