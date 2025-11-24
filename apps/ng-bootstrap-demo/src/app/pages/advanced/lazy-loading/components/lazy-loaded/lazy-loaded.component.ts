import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';

@Component({
  selector: 'demo-lazy-loaded',
  templateUrl: './lazy-loaded.component.html',
  styleUrls: ['./lazy-loaded.component.scss'],
  imports: [FormsModule, BsFormModule]
})
export class LazyLoadedComponent {
  text = 'Lazy-loaded';
}