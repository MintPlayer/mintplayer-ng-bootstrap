import { Component, inject } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { EnumItem, EnumService } from '@mintplayer/ng-bootstrap/enum';

@Component({
  selector: 'demo-button-type',
  templateUrl: './button-type.component.html',
  styleUrls: ['./button-type.component.scss'],
  imports: [BsButtonTypeDirective]
})
export class ButtonTypeComponent {
  constructor() {
    this.colorValues = this.enumService.getItems(Color);
  }
  
  colors = Color;
  colorValues: EnumItem[];
  enumService = inject(EnumService);
}
