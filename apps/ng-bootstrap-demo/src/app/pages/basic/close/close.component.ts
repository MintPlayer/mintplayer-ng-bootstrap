import { Component } from '@angular/core';

@Component({
  selector: 'demo-close',
  templateUrl: './close.component.html',
  styleUrls: ['./close.component.scss']
})
export class CloseComponent {

  onClose() {
    alert('Close');
  }

}
