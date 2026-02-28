import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsRangeModule } from '@mintplayer/ng-bootstrap/range';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsColorPickerModule } from '@mintplayer/ng-bootstrap/color-picker';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'demo-color-picker',
  templateUrl: './color-picker.component.html',
  styleUrls: ['./color-picker.component.scss'],
  standalone: true,
  imports: [DecimalPipe, FormsModule, BsGridModule, BsButtonTypeDirective, BsButtonGroupComponent, BsColorPickerModule, BsToggleButtonModule, BsRangeModule, BsListGroupModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorPickerComponent {

  colors = Color;
  allowAlpha = signal(false);
  selectedColor = signal('#0000FF');
  selectedAlpha = signal(1);

  setColor(color: string) {
    this.selectedColor.set(color);
    this.selectedAlpha.set(1);
  }

}
