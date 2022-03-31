import { Component, OnInit } from '@angular/core';
import { RgbColor } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss']
})
export class ColorPickerComponent implements OnInit {

  constructor() { }

  selectedColor: RgbColor = { r: 255, g: 255, b: 255 };

  ngOnInit(): void {
  }

  setRed() {
    this.selectedColor = { r: 0, g: 0, b: 0 };
    // this.selectedColor = { r: 255, g: 255, b: 255 };
  }

}
