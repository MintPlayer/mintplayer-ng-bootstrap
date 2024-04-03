import { Component } from '@angular/core';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';

@Component({
  selector: 'demo-close',
  templateUrl: './close.component.html',
  styleUrls: ['./close.component.scss'],
  standalone: true,
  imports: [BsCloseComponent]
})
export class CloseComponent {

  onClose() {
    alert('Close');
  }

}
