import { Component, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsSplitStringPipe } from '@mintplayer/ng-bootstrap/split-string';

@Component({
  selector: 'demo-split-string',
  templateUrl: './split-string.component.html',
  styleUrls: ['./split-string.component.scss'],
  imports: [FormsModule, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsListGroupComponent, BsListGroupItemComponent, BsSplitStringPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SplitStringComponent {
  text = '';
}
