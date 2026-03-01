import { Component, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsColorPickerComponent } from '@mintplayer/ng-bootstrap/color-picker';
import { BsFontColorPipe } from '@mintplayer/ng-bootstrap/font-color';

@Component({
  selector: 'demo-font-color',
  templateUrl: './font-color.component.html',
  styleUrls: ['./font-color.component.scss'],
  imports: [FormsModule, BsColorPickerComponent, BsFontColorPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FontColorComponent {
  background = '#360984';
}
