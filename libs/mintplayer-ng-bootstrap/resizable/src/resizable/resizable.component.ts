import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, forwardRef, signal } from '@angular/core';
import { ResizeAction } from '../interfaces/resize-action';
import { RESIZABLE } from '../providers/resizable.provider';
import { ResizablePositioning } from '../types/positioning';
import { PresetPosition } from '../interfaces/preset-position';
import { BsResizeGlyphDirective } from '../resize-glyph/resize-glyph.directive';

@Component({
  selector: 'bs-resizable',
  templateUrl: './resizable.component.html',
  styleUrls: ['./resizable.component.scss'],
  imports: [BsResizeGlyphDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: RESIZABLE, useExisting: forwardRef(() => BsResizableComponent) }
  ],
  host: {
    '[style.margin-left.px]': 'marginLeft',
    '[style.margin-right.px]': 'marginRight',
    '[style.margin-top.px]': 'marginTop',
    '[style.margin-bottom.px]': 'marginBottom',
    '[style.width.px]': 'width',
    '[style.height.px]': 'height',
    '[style.left.px]': 'left',
    '[style.top.px]': 'top',
    '[class.d-block]': 'true',
    '[class.border]': 'true',
    '[class]': 'hostPosition()',
  },
})
export class BsResizableComponent {
  element = inject(ElementRef<HTMLElement>);

  resizeAction?: ResizeAction;
  positioning = input<ResizablePositioning>('inline');

  hostPosition = computed(() => {
    const positioning = this.positioning();
    switch (positioning) {
      case 'absolute': return 'position-absolute';
      case 'inline': return 'position-relative';
    }
  });

  wrapperPosition = computed(() => {
    const positioning = this.positioning();
    switch (positioning) {
      case 'absolute': return ['position-relative', 'h-100'];
      case 'inline': return [];
    }
  });

  readonly presetPosition = input<PresetPosition | undefined>(undefined);

  constructor() {
    effect(() => {
      const value = this.presetPosition();
      if (value) {
        if (this.positioning() === 'inline') {
          throw 'presetPosition currently only supported in absolute positioning';
        }
        this.width = value.width;
        this.height = value.height;
        this.left = value.left;
        this.top = value.top;
        this.marginTop = this.marginBottom = this.marginLeft = this.marginRight = undefined;
      }
    });
  }

  marginLeft?: number;
  marginRight?: number;
  marginTop?: number;
  marginBottom?: number;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}
