import { Component, CUSTOM_ELEMENTS_SCHEMA, signal, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import '@mintplayer/splitter';

@Component({
  selector: 'demo-splitter',
  templateUrl: './splitter.component.html',
  styleUrls: ['./splitter.component.scss'],
  imports: [FormsModule, BsToggleButtonComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitterComponent {
  bgWarning = signal(false);
}
