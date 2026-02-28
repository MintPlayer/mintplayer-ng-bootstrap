import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsScrollspyModule } from '@mintplayer/ng-bootstrap/scrollspy';

@Component({
  selector: 'demo-scrollspy',
  templateUrl: './scrollspy.component.html',
  styleUrls: ['./scrollspy.component.scss'],
  standalone: true,
  imports: [BsScrollspyModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScrollspyComponent {}
