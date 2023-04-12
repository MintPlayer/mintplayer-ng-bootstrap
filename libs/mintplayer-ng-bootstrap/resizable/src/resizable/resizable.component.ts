import { Component, Directive, ElementRef, HostBinding } from '@angular/core';
import { ResizeAction } from '../interfaces/resize-action';
import { RESIZABLE } from '../providers/resizable.provider';

@Component({
  selector: 'bs-resizable',
  templateUrl: './resizable.component.html',
  styleUrls: ['./resizable.component.scss'],
  providers: [
    { provide: RESIZABLE, useExisting: BsResizableComponent }
  ]
})
export class BsResizableComponent {
  constructor(element: ElementRef<HTMLElement>) {
    this.element = element;
  }

  resizeAction?: ResizeAction;
  element: ElementRef<HTMLElement>;
  
  @HostBinding('style.margin-left.px') marginLeft?: number;
  @HostBinding('style.margin-right.px') marginRight?: number;
  @HostBinding('style.margin-top.px') marginTop?: number;
  @HostBinding('style.margin-bottom.px') marginBottom?: number;
  @HostBinding('style.height.px') height?: number;

  @HostBinding('class.d-block')
  @HostBinding('class.border')
  @HostBinding('class.position-relative')
  classes = true;
}
