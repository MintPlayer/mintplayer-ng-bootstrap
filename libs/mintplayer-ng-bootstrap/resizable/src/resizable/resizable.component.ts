import { Component, Directive, ElementRef, HostBinding, Input, OnDestroy, forwardRef } from '@angular/core';
import { BehaviorSubject, Observable, map, Subject, takeUntil } from 'rxjs';
import { ResizeAction } from '../interfaces/resize-action';
import { RESIZABLE } from '../providers/resizable.provider';
import { ResizablePositioning } from '../types/positioning';
import { PresetPosition } from '../interfaces/preset-position';

@Component({
  selector: 'bs-resizable',
  templateUrl: './resizable.component.html',
  styleUrls: ['./resizable.component.scss'],
  providers: [
    { provide: RESIZABLE, useExisting: forwardRef(() => BsResizableComponent) }
  ]
})
export class BsResizableComponent implements OnDestroy {
  constructor(element: ElementRef<HTMLElement>) {
    this.element = element;
    this.hostPosition$ = this.positioning$.pipe(map((positioning) => {
      switch (positioning) {
        case 'absolute': return 'position-absolute';
        case 'inline': return 'position-relative';
      }
    }));

    this.wrapperPosition$ = this.positioning$.pipe(map((positioning) => {
      switch (positioning) {
        case 'absolute': return ['position-relative', 'h-100']
        case 'inline': return [];
      }
    }));

    this.hostPosition$.pipe(takeUntil(this.destroyed$))
      .subscribe(hostPosition => this.hostClass = hostPosition);
  }

  resizeAction?: ResizeAction;
  element: ElementRef<HTMLElement>;
  hostPosition$: Observable<string>;
  wrapperPosition$: Observable<string[]>;

  //#region Positioning
  positioning$ = new BehaviorSubject<ResizablePositioning>('inline');
  public get positioning() {
    return this.positioning$.value;
  }
  @Input() public set positioning(value: ResizablePositioning) {
    this.positioning$.next(value);
  }
  //#endregion

  @Input() public set presetPosition(value: PresetPosition) {
    if (this.positioning === 'inline') {
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

  destroyed$ = new Subject();
  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
