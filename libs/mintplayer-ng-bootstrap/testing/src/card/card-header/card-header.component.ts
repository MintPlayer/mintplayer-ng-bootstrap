import { Component } from '@angular/core';
import { BsCardHeaderComponent } from '@mintplayer/ng-bootstrap/card';

@Component({
  selector: 'bs-card-header',
  templateUrl: './card-header.component.html',
  styleUrls: ['./card-header.component.scss'],
  providers: [
    { provide: BsCardHeaderComponent, useExisting: BsCardHeaderMockComponent }
  ]
})
export class BsCardHeaderMockComponent {}
