import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';

@Component({
  selector: 'demo-button-group',
  templateUrl: './button-group.component.html',
  styleUrls: ['./button-group.component.scss'],
  standalone: true,
  imports: [BsButtonTypeDirective, BsButtonGroupComponent]
})
export class ButtonGroupComponent {
  colors = Color;
}
