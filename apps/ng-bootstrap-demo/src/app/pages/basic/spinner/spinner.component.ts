import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { EnumItem, EnumService } from '@mintplayer/ng-bootstrap/enum';
import { BsSpinnerComponent } from '@mintplayer/ng-bootstrap/spinner';

@Component({
  selector: 'demo-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss'],
  standalone: true,
  imports: [BsSpinnerComponent]
})
export class SpinnerComponent {
  constructor(enumService: EnumService) {
    this.colors = enumService.getItems(Color);
  }

  colors: EnumItem[];
}
