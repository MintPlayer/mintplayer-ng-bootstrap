import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';
import '@mintplayer/splitter';

@Component({
  selector: 'demo-splitter',
  templateUrl: './splitter.component.html',
  styleUrls: ['./splitter.component.scss'],
  standalone: true,
  imports: [FormsModule, BsToggleButtonModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SplitterComponent {
  bgWarning = signal(false);
}
