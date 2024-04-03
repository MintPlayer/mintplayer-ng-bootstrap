import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';

@Component({
  selector: 'demo-badge',
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss'],
  standalone: true,
  imports: [BsBadgeComponent]
})
export class BadgeComponent {
  colors = Color;
}
