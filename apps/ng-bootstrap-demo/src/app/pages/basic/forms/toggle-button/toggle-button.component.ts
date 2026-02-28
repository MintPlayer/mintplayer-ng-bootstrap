import { JsonPipe } from '@angular/common';
import { Component, model, signal, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsToggleButtonComponent, BsToggleButtonGroupDirective } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-toggle-button',
  templateUrl: './toggle-button.component.html',
  styleUrls: ['./toggle-button.component.scss'],
  imports: [JsonPipe, FormsModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsToggleButtonComponent, BsToggleButtonGroupDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleButtonComponent {
  darkMode = signal<boolean | null>(true);

  // Checkbox - Multi mode
  favoriteColors = model<string[]>([]);

  // Checkbox - Single mode
  isAllDisabled = model(false);
  isHstsEnabled = model(true);
  isCrossPlatform = model(false);

  // Radio
  theme = model<'light' | 'dark' | 'contrast' | 'disabled'>('light');
}
