import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsCardComponent, BsCardHeaderComponent } from '@mintplayer/ng-bootstrap/card';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';

@Component({
  selector: 'demo-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  standalone: true,
  imports: [BsCardComponent, BsCardHeaderComponent, BsListGroupComponent, BsListGroupItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent {}
