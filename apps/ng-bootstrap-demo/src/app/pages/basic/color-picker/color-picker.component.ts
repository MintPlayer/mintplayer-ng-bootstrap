import { AfterViewInit, Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { RgbColor } from '@mintplayer/ng-bootstrap/color-picker';

@Component({
  selector: 'demo-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss']
})
export class ColorPickerComponent implements AfterViewInit {

  colors = Color;
  selectedColor: RgbColor = { r: 0, g: 0, b: 255 };

  ngAfterViewInit() {
    this.selectedColor = { r: 255, g: 255, b: 255 };
  }

  setRed() {
    this.selectedColor = { r: 255, g: 0, b: 0 };
  }

}
