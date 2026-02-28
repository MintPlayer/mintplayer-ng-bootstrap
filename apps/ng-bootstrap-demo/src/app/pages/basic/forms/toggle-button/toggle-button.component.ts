import { JsonPipe } from '@angular/common';
import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsToggleButtonComponent, BsToggleButtonValueAccessor, BsToggleButtonGroupDirective } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-toggle-button',
  templateUrl: './toggle-button.component.html',
  styleUrls: ['./toggle-button.component.scss'],
  imports: [JsonPipe, FormsModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsToggleButtonComponent, BsToggleButtonValueAccessor, BsToggleButtonGroupDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToggleButtonComponent {
  darkMode = signal<boolean | null>(true);

  // Checkbox - Multi mode
  favoriteColors = signal<string[]>([]);

  // Checkbox - Single mode
  isAllDisabled = signal(false);
  isHstsEnabled = signal(true);
  isCrossPlatform = signal(false);

  // Radio
  theme = signal<'light' | 'dark' | 'contrast' | 'disabled'>('light');
}
