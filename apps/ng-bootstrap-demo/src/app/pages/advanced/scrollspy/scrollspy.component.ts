import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsScrollspyComponent, BsScrollspyDirective } from '@mintplayer/ng-bootstrap/scrollspy';

@Component({
  selector: 'demo-scrollspy',
  templateUrl: './scrollspy.component.html',
  styleUrls: ['./scrollspy.component.scss'],
  standalone: true,
  imports: [BsScrollspyComponent, BsScrollspyDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScrollspyComponent {}
