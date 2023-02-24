import { Component, ViewChild } from '@angular/core';
import { BsBoxResizeDirective } from '@mintplayer/ng-bootstrap/box-resize';

@Component({
  selector: 'demo-box-resize',
  templateUrl: './box-resize.component.html',
  styleUrls: ['./box-resize.component.scss']
})
export class BoxResizeComponent {
  @ViewChild('bsBoxResize') bsBoxResize!: BsBoxResizeDirective;
}
