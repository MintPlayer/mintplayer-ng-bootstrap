import { Component } from '@angular/core';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';

@Component({
  selector: 'bs-close',
  templateUrl: './close.component.html',
  styleUrls: ['./close.component.scss'],
  providers: [
    { provide: BsCloseComponent, useExisting: BsCloseMockComponent }
  ]
})
export class BsCloseMockComponent {}
