import { Component } from '@angular/core';
import { BsCardComponent, BsCardHeaderComponent } from '@mintplayer/ng-bootstrap/card';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';

@Component({
  selector: 'demo-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  imports: [BsCardComponent, BsCardHeaderComponent, BsListGroupComponent, BsListGroupItemComponent]
})
export class CardComponent {}
