import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsRangeModule } from '@mintplayer/ng-bootstrap/range';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsColorPickerModule } from '@mintplayer/ng-bootstrap/color-picker';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';

@Component({
  selector: 'demo-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss'],
  standalone: true,
  imports: [DecimalPipe, FormsModule, BsGridModule, BsButtonTypeDirective, BsButtonGroupComponent, BsColorPickerModule, BsCheckboxComponent, BsRangeModule, BsListGroupModule]
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
