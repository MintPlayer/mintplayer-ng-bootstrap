import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsResizableComponent } from '@mintplayer/ng-bootstrap/resizable';

@Component({
  selector: 'demo-resizable',
  templateUrl: './resizable.component.html',
  styleUrls: ['./resizable.component.scss'],
  standalone: true,
  imports: [BsResizableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResizableComponent {}
