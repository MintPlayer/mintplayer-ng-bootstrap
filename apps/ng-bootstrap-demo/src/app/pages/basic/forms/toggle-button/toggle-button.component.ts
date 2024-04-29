import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsSwitchComponent } from '@mintplayer/ng-bootstrap/switch';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsRadioButtonComponent } from '@mintplayer/ng-bootstrap/radio-button';
import { BsRadioToggleButtonComponent } from '@mintplayer/ng-bootstrap/radio-toggle-button';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsCheckGroupDirective } from '@mintplayer/ng-bootstrap/check-group/src/check-group.directive';

@Component({
  selector: 'demo-toggle-button',
  templateUrl: './toggle-button.component.html',
  styleUrls: ['./toggle-button.component.scss'],
  standalone: true,
  imports: [JsonPipe, FormsModule, BsGridModule, BsToggleButtonModule, BsCheckboxComponent, BsRadioButtonComponent, BsRadioToggleButtonComponent, BsSwitchComponent, BsCheckGroupDirective]
})
export class ToggleButtonComponent {
  darkMode: boolean | null = true;

  // Checkbox - Multi mode
  favoriteColors: string[] = [];

  // Checkbox - Single mode
  isAllDisabled = false;
  isHstsEnabled = true;
  isCrossPlatform = false;

  // Radio
  theme: 'light' | 'dark' | 'contrast' | 'disabled' = 'light';
}
