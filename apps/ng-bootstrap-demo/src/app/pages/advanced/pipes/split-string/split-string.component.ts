import { Component, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsSplitStringPipe } from '@mintplayer/ng-bootstrap/split-string';

@Component({
  selector: 'demo-split-string',
  templateUrl: './split-string.component.html',
  styleUrls: ['./split-string.component.scss'],
  standalone: true,
  imports: [FormsModule, BsFormModule, BsGridModule, BsListGroupModule, BsSplitStringPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitStringComponent {
  text = '';
}
