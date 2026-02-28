import { JsonPipe } from '@angular/common';
import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-toggle-button',
  templateUrl: './toggle-button.component.html',
  styleUrls: ['./toggle-button.component.scss'],
  standalone: true,
  imports: [JsonPipe, FormsModule, BsGridModule, BsToggleButtonModule],
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
