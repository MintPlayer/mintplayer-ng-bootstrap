import { Component } from '@angular/core';
import { BsCardComponent, BsCardHeaderComponent } from '@mintplayer/ng-bootstrap/card';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';

@Component({
  selector: 'demo-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  imports: [BsCardComponent, BsCardHeaderComponent, BsListGroupModule]
})
export class CardComponent {}
