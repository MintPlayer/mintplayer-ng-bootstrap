import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsCardModule } from '@mintplayer/ng-bootstrap/card';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsPlaceholderModule } from '@mintplayer/ng-bootstrap/placeholder';

@Component({
  selector: 'demo-placeholder',
  templateUrl: './placeholder.component.html',
  styleUrls: ['./placeholder.component.scss'],
  standalone: true,
  imports: [FormsModule, BsGridModule, BsCardModule, BsAlertModule, BsPlaceholderModule, BsCheckboxComponent]
})
export class PlaceholderComponent {

  constructor() {
    setTimeout(() => this.isLoading = false, 3000);
  }

  isLoading = true;
  colors = Color;
  lines = [
    'Hello world',
    'This is me',
    'Life should be',
    'Ooh, ooh, yeah',
    'Fun for everyone',
  ];
}
