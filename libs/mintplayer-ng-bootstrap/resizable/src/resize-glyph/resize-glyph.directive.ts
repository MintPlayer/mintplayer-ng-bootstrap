import { computed, Directive, inject, input, signal } from '@angular/core';
import { Directionality } from '@angular/cdk/bidi';
import { Position } from '@mintplayer/ng-bootstrap';
import type { BsResizableComponent } from '../resizable/resizable.component';
import { PhysicalSide, ResizeAction } from '../interfaces/resize-action';
import { BsResizableLabels, DEFAULT_RESIZABLE_LABELS } from '../interfaces/resize-labels';
import { RESIZABLE } from '../providers/resizable.provider';
import { dragResize, keyboardResizePoint, ResizeUpdate, toPhysicalSides } from './resize-math';

/**
 * One drag handle of `bs-resizable`. Its logical positions (`start`/`end`) are resolved to
 * physical sides once, from the document direction, and that one value drives the glyph's
 * placement class, its drag and keyboard math and its accessible name, so the three can never
 * disagree.
 */
@Directive({
  selector: '[bsResizeGlyph]',
  host: {
    '[class]': 'sideClasses()',
    '[class.glyph]': 'true',
    '[class.active]': 'activeClass()',
    '[attr.role]': '"separator"',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-orientation]': 'ariaOrientation()',
    '[attr.tabindex]': '"0"',
    '(mousedown)': 'onMouseDown($event)',
    '(touchstart)': 'onTouchStart($event)',
    '(document:mousemove)': 'onMouseMove($event)',
    '(touchmove)': 'onTouchMove($event)',
    '(document:mouseup)': 'onPointerUp()',
    '(touchend)': 'onTouchEnd($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class BsResizeGlyphDirective {

  // Can't use typed DI because of the `import type`
  private readonly resizable: BsResizableComponent = inject(RESIZABLE);
  private readonly dir = inject(Directionality);

  readonly bsResizeGlyph = input<Position[]>([]);

  readonly activeClass = signal(false);

  readonly sides = computed(() => toPhysicalSides(this.bsResizeGlyph(), this.dir.valueSignal() === 'rtl'));

  readonly sideClasses = computed(() => this.sides().join(' '));

  readonly ariaOrientation = computed(() => {
    const s = this.sides();
    if (s.length !== 1) return null;
    return (s[0] === 'top' || s[0] === 'bottom') ? 'horizontal' : 'vertical';
  });

  readonly ariaLabel = computed(() => {
    const labels: BsResizableLabels = { ...DEFAULT_RESIZABLE_LABELS, ...this.resizable.labels() };
    const s = this.sides();
    const v = s.find((side) => side === 'top' || side === 'bottom');
    const h = s.find((side) => side === 'left' || side === 'right');
    if (v && h) {
      const key = `${v}${h === 'left' ? 'Left' : 'Right'}` as keyof BsResizableLabels;
      return labels[key];
    }
    return (v ?? h) ? labels[(v ?? h) as PhysicalSide] : null;
  });

  onMouseDown(ev: MouseEvent) {
    ev.preventDefault();
    this.onPointerDown();
  }

  onTouchStart(ev: TouchEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.onPointerDown();
  }

  onMouseMove(ev: MouseEvent) {
    // Registered on the document by every glyph: only the one that started the drag applies it.
    if (!this.activeClass() || !this.resizable.resizeAction) return;
    ev.preventDefault();
    this.apply(dragResize(this.resizable.resizeAction, ev.clientX, ev.clientY));
  }

  onTouchMove(ev: TouchEvent) {
    if (ev.touches.length !== 1 || !this.activeClass() || !this.resizable.resizeAction) return;
    ev.preventDefault();
    ev.stopPropagation();
    this.apply(dragResize(this.resizable.resizeAction, ev.touches[0].clientX, ev.touches[0].clientY));
  }

  onTouchEnd(ev: TouchEvent) {
    ev.preventDefault();
    ev.stopPropagation();
    this.onPointerUp();
  }

  onPointerDown() {
    this.resizable.resizeAction = this.captureAction();
    this.activeClass.set(true);
  }

  onPointerUp() {
    if (!this.activeClass()) return;
    this.resizable.resizeAction = undefined;
    this.activeClass.set(false);
  }

  /**
   * Keyboard alternative to drag: an arrow key moves the glyph's own edge by 10px (1px with
   * Shift). It is computed as a one-step drag, so it moves the same edge and writes the same
   * signals as dragging would, in both positioning modes.
   */
  onKeydown(event: KeyboardEvent) {
    const action = this.captureAction();
    const point = keyboardResizePoint(action, event.key, event.shiftKey ? 1 : 10);
    if (!point) return;
    event.preventDefault();
    this.apply(dragResize(action, point.x, point.y));
  }

  private captureAction(): ResizeAction {
    const el: HTMLElement = this.resizable.element.nativeElement;
    const rect = el.getBoundingClientRect();
    const styles = window.getComputedStyle(el);
    // An unset margin computes to '' in some engines: treat it as 0, never NaN.
    const px = (value: string) => parseFloat(value) || 0;
    return {
      positioning: this.resizable.positioning(),
      sides: this.sides(),
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      offset: { left: el.offsetLeft, top: el.offsetTop },
      margin: {
        left: px(styles.marginLeft),
        right: px(styles.marginRight),
        top: px(styles.marginTop),
        bottom: px(styles.marginBottom),
      },
    };
  }

  private apply(update: ResizeUpdate) {
    const r = this.resizable;
    const targets = {
      width: r.width, height: r.height, left: r.left, top: r.top,
      marginLeft: r.marginLeft, marginRight: r.marginRight, marginTop: r.marginTop, marginBottom: r.marginBottom,
    };
    (Object.keys(update) as (keyof ResizeUpdate)[]).map((key) => targets[key].set(update[key]));
  }
}
