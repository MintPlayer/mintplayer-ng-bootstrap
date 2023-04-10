import { Component, ElementRef } from '@angular/core';
import { ResizeAction } from '../interfaces/resize-action';

@Component({
  selector: 'bs-resizable',
  templateUrl: './resizable.component.html',
  styleUrls: ['./resizable.component.scss']
})
export class BsResizableComponent {
  constructor(element: ElementRef<HTMLElement>) {
    this.element = element;
  }

  resizeAction?: ResizeAction;
  element: ElementRef<HTMLElement>;
}
