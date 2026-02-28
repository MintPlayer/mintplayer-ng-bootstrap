import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';

@Component({
  selector: 'demo-close',
  templateUrl: './close.component.html',
  styleUrls: ['./close.component.scss'],
  standalone: true,
  imports: [BsCloseComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloseComponent {

  onClose() {
    alert('Close');
  }

}
