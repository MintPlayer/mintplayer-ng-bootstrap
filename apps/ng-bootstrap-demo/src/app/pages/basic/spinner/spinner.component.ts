import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { EnumItem, EnumService } from '@mintplayer/ng-bootstrap/enum';

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
  
  trackByColor(index: number, item: EnumItem) {
    return item.key;
  }
}
