import { Component } from '@angular/core';

@Component({
  selector: 'demo-toggle-button',
  templateUrl: './toggle-button.component.html',
  styleUrls: ['./toggle-button.component.scss']
})
export class ToggleButtonComponent {
  darkMode: boolean | null = true;

  // Checkbox - Multi mode
  favoriteColors: string[] = [];

  // Checkbox - Single mode
  isDarkMode = false;
  isHstsEnabled = false;
  isCrossPlatform = false;

  // Radio
  theme: 'light' | 'dark' | 'contrast' | 'disabled' = 'light';
}
