import { Component } from '@angular/core';
import { BsCardComponent } from '@mintplayer/ng-bootstrap/card';

@Component({
  selector: 'bs-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  providers: [
    { provide: BsCardComponent, useExisting: BsCardMockComponent }
  ]
})
export class BsCardMockComponent {}
