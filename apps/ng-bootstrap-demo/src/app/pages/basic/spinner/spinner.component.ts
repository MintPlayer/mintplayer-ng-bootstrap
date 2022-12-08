import { Component } from '@angular/core';
import { Color, EnumItem, EnumService } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss']
})
export class SpinnerComponent {
  constructor(enumService: EnumService) {
    this.colors = enumService.getItems(Color);
  }
  colors: EnumItem[];
}
