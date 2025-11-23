import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsRangeModule } from '@mintplayer/ng-bootstrap/range';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsColorPickerComponent } from '@mintplayer/ng-bootstrap/color-picker';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'demo-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss'],
  imports: [DecimalPipe, FormsModule, BsGridModule, BsButtonTypeDirective, BsButtonGroupComponent, BsColorPickerComponent, BsToggleButtonComponent, BsRangeModule, BsListGroupModule]
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
