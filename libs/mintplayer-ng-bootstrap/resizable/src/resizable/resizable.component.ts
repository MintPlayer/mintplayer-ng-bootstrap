import { Component, ElementRef, HostBinding, Input, forwardRef, signal, computed, effect } from '@angular/core';
import { ResizeAction } from '../interfaces/resize-action';
import { RESIZABLE } from '../providers/resizable.provider';
import { ResizablePositioning } from '../types/positioning';
import { PresetPosition } from '../interfaces/preset-position';

@Component({
  selector: 'bs-resizable',
  templateUrl: './resizable.component.html',
  styleUrls: ['./resizable.component.scss'],
  standalone: false,
  providers: [
    { provide: RESIZABLE, useExisting: forwardRef(() => BsResizableComponent) }
  ],
})
export class BsResizableComponent {
  constructor(element: ElementRef<HTMLElement>) {
    this.element = element;
    this.hostPosition = computed(() => {
      const positioning = this.positioningSignal();
      switch (positioning) {
        case 'absolute': return 'position-absolute';
        case 'inline': return 'position-relative';
      }
    });

    this.wrapperPosition = computed(() => {
      const positioning = this.positioningSignal();
      switch (positioning) {
        case 'absolute': return ['position-relative', 'h-100']
        case 'inline': return [];
      }
    });

    effect(() => {
      this.hostClass = this.hostPosition();
    });
  }

  resizeAction?: ResizeAction;
  element: ElementRef<HTMLElement>;
  hostPosition;
  wrapperPosition;

  //#region Positioning
  positioningSignal = signal<ResizablePositioning>('inline');
  @Input() set positioning(val: ResizablePositioning) {
    this.positioningSignal.set(val);
  }
  get positioning(): ResizablePositioning {
    return this.positioningSignal();
  }
  //#endregion

  @Input() public set presetPosition(value: PresetPosition) {
    if (this.positioningSignal() === 'inline') {
      throw 'presetPosition currently only supported in absolute positioning';
    }
    this.width = value.width;
    this.height = value.height;
    this.left = value.left;
    this.top = value.top;
    this.marginTop = this.marginBottom = this.marginLeft = this.marginRight = undefined;
  }

  @HostBinding('style.margin-left.px') marginLeft?: number;
  @HostBinding('style.margin-right.px') marginRight?: number;
  @HostBinding('style.margin-top.px') marginTop?: number;
  @HostBinding('style.margin-bottom.px') marginBottom?: number;
  @HostBinding('style.width.px') width?: number;
  @HostBinding('style.height.px') height?: number;
  @HostBinding('style.left.px') left?: number;
  @HostBinding('style.top.px') top?: number;


  @HostBinding('class.d-block')
  @HostBinding('class.border')
  classes = true;

  @HostBinding('class')
  hostClass: string | null = null;
}
