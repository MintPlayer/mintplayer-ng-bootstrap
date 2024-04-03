import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsColorPickerModule } from '@mintplayer/ng-bootstrap/color-picker';
import { BsFontColorPipe } from '@mintplayer/ng-bootstrap/font-color';

@Component({
  selector: 'demo-font-color',
  templateUrl: './font-color.component.html',
  styleUrls: ['./font-color.component.scss'],
  standalone: true,
  imports: [FormsModule, BsColorPickerModule, BsFontColorPipe]
})
export class FontColorComponent {
  background = '#360984';
}
