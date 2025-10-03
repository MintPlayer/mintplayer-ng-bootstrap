import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsCardModule } from '@mintplayer/ng-bootstrap/card';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsPlaceholderModule } from '@mintplayer/ng-bootstrap/placeholder';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-placeholder',
  templateUrl: './placeholder.component.html',
  styleUrls: ['./placeholder.component.scss'],
  standalone: true,
  imports: [FormsModule, BsGridModule, BsCardModule, BsAlertModule, BsPlaceholderModule, BsToggleButtonModule]
})
export class PlaceholderComponent {

  constructor() {
    setTimeout(() => this.isLoading.set(false), 3000);
  }

  isLoading = signal(true);
  colors = Color;
  lines = [
    'Hello world',
    'This is me',
    'Life should be',
    'Ooh, ooh, yeah',
    'Fun for everyone',
  ];
}
