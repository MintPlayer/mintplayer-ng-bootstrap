import { Component, Input } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';

@Component({
  selector: 'bs-badge',
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss'],
  providers: [
    { provide: BsBadgeComponent, useExisting: BsBadgeMockComponent }
  ]
})
export class BsBadgeMockComponent {
  @Input() public type: Color = Color.primary;
}
