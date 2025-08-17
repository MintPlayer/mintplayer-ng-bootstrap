import { Component, inject } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { EnumService } from '@mintplayer/ng-bootstrap/enum';
import { BsSpinnerComponent } from '@mintplayer/ng-bootstrap/spinner';

@Component({
  selector: 'demo-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss'],
  standalone: true,
  imports: [BsSpinnerComponent]
})
export class SpinnerComponent {
  enumService = inject(EnumService);
  colors = this.enumService.getItems(Color);
}
