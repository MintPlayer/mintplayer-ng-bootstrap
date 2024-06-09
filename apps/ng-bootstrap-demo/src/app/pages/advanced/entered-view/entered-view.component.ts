import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsEnteredViewDirective } from '@mintplayer/ng-bootstrap/entered-view';

@Component({
  selector: 'demo-entered-view',
  standalone: true,
  imports: [CommonModule, BsEnteredViewDirective],
  templateUrl: './entered-view.component.html',
  styleUrl: './entered-view.component.scss',
})
export class EnteredViewComponent {
  colors = [
    'primary',
    'secondary',
    'success',
    'danger',
    'warning',
    'info',
    'light',
    'dark',
  ];
}
