import { Component } from '@angular/core';
import { BsScrollspyModule } from '@mintplayer/ng-bootstrap/scrollspy';

@Component({
  selector: 'demo-scrollspy',
  templateUrl: './scrollspy.component.html',
  styleUrls: ['./scrollspy.component.scss'],
  standalone: true,
  imports: [BsScrollspyModule]
})
export class ScrollspyComponent {}
