import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { EnumItem, EnumService } from '@mintplayer/ng-bootstrap/enum';

@Component({
  selector: 'demo-button-type',
  templateUrl: './button-type.component.html',
  styleUrls: ['./button-type.component.scss']
})
export class ButtonTypeComponent {
  constructor(private enumService: EnumService) {
    this.colorValues = this.enumService.getItems(Color);
  }
  
  colors = Color;
  colorValues: EnumItem[];

  trackByColor(index: number, item: EnumItem) {
    return item.key;
  }
}
