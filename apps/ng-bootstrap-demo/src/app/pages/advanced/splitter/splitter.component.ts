import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCheckboxModule } from '@mintplayer/ng-bootstrap/checkbox';
import { BsSplitterModule } from '@mintplayer/ng-bootstrap/splitter';

@Component({
  selector: 'demo-splitter',
  templateUrl: './splitter.component.html',
  styleUrls: ['./splitter.component.scss'],
  standalone: true,
  imports: [FormsModule, BsSplitterModule, BsCheckboxModule]
})
export class SplitterComponent {
  bgWarning = false;
}
