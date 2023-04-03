import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss']
})
export class ColorPickerComponent {

  colors = Color;
  allowAlpha = false;
  selectedColor = '#0000FF';
  selectedAlpha = 1;

  setColor(color: string) {
    this.selectedColor = color;
    this.selectedAlpha = 1;
  }

}
