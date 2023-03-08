import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss']
})
export class ColorPickerComponent {

  colors = Color;
  selectedColor = '#0000FF';

  setColor(color: string) {
    this.selectedColor = color;
  }

}
