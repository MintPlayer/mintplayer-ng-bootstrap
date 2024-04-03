import { Component } from '@angular/core';
import { BsCardModule } from '@mintplayer/ng-bootstrap/card';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';

@Component({
  selector: 'demo-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  standalone: true,
  imports: [BsCardModule, BsListGroupModule]
})
export class CardComponent {}
