import { Component } from '@angular/core';
import { BsResizableModule } from '@mintplayer/ng-bootstrap/resizable';

@Component({
  selector: 'demo-resizable',
  templateUrl: './resizable.component.html',
  styleUrls: ['./resizable.component.scss'],
  imports: [BsResizableModule]
})
export class ResizableComponent {}
