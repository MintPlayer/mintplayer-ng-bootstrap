import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'demo-placeholder',
  templateUrl: './placeholder.component.html',
  styleUrls: ['./placeholder.component.scss']
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
