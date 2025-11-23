import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertComponent, BsAlertCloseComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsCardComponent, BsCardHeaderComponent } from '@mintplayer/ng-bootstrap/card';
import { BsGridColumnDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsPlaceholderModule } from '@mintplayer/ng-bootstrap/placeholder';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-placeholder',
  templateUrl: './placeholder.component.html',
  styleUrls: ['./placeholder.component.scss'],
  standalone: true,
  imports: [FormsModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsCardComponent, BsCardHeaderComponent, BsAlertComponent, BsAlertCloseComponent, BsPlaceholderModule, BsToggleButtonComponent]
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
