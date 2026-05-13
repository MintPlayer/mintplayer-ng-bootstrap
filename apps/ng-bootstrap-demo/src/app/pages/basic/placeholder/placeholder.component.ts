import { Component, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsCardComponent, BsCardHeaderComponent } from '@mintplayer/ng-bootstrap/card';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsPlaceholderComponent, BsPlaceholderFieldDirective } from '@mintplayer/ng-bootstrap/placeholder';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';

@Component({
  selector: 'demo-placeholder',
  templateUrl: './placeholder.component.html',
  styleUrls: ['./placeholder.component.scss'],
  imports: [FormsModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsCardComponent, BsCardHeaderComponent, BsPlaceholderComponent, BsPlaceholderFieldDirective, BsCheckboxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
