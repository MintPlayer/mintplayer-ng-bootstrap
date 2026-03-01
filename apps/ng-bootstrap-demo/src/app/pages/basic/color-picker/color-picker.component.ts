import { Component, model, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsRangeComponent } from '@mintplayer/ng-bootstrap/range';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsColorPickerComponent } from '@mintplayer/ng-bootstrap/color-picker';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'demo-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss'],
  imports: [DecimalPipe, FormsModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsButtonTypeDirective, BsButtonGroupComponent, BsColorPickerComponent, BsToggleButtonComponent, BsRangeComponent, BsListGroupComponent, BsListGroupItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorPickerComponent {

  colors = Color;
  allowAlpha = model(false);
  selectedColor = model('#0000FF');
  selectedAlpha = model(1);

  setColor(color: string) {
    this.selectedColor.set(color);
    this.selectedAlpha.set(1);
  }

}
