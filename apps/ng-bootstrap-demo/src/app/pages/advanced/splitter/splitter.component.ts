import { Component, CUSTOM_ELEMENTS_SCHEMA, model, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';
import '@mintplayer/ng-bootstrap/web-components/splitter';

@Component({
  selector: 'demo-splitter',
  templateUrl: './splitter.component.html',
  styleUrls: ['./splitter.component.scss'],
  imports: [FormsModule, BsCheckboxComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitterComponent {
  bgWarning = model(false);
}
