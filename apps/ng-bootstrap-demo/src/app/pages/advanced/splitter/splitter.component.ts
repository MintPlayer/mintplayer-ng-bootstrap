import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsSplitterModule } from '@mintplayer/ng-bootstrap/splitter';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-splitter',
  templateUrl: './splitter.component.html',
  styleUrls: ['./splitter.component.scss'],
  standalone: true,
  imports: [FormsModule, BsSplitterModule, BsToggleButtonModule]
})
export class SplitterComponent {
  bgWarning = signal(false);
}
