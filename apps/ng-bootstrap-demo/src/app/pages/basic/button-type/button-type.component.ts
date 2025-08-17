import { Component, inject } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { EnumService } from '@mintplayer/ng-bootstrap/enum';

@Component({
  selector: 'demo-button-type',
  templateUrl: './button-type.component.html',
  styleUrls: ['./button-type.component.scss'],
  standalone: true,
  imports: [BsButtonTypeDirective]
})
export class ButtonTypeComponent {
  colors = Color;
  enumService = inject(EnumService);
  colorValues = this.enumService.getItems(Color)
}
