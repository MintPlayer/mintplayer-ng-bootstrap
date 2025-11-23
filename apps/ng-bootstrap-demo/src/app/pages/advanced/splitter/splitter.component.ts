import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsSplitterModule } from '@mintplayer/ng-bootstrap/splitter';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-splitter',
  templateUrl: './splitter.component.html',
  styleUrls: ['./splitter.component.scss'],
  imports: [FormsModule, BsSplitterModule, BsToggleButtonComponent]
})
export class SplitterComponent {
  bgWarning = false;
}
