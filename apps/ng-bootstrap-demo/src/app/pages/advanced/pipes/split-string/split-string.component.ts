import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridColumnDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsListGroupModule } from '@mintplayer/ng-bootstrap/list-group';
import { BsSplitStringPipe } from '@mintplayer/ng-bootstrap/split-string';

@Component({
  selector: 'demo-split-string',
  templateUrl: './split-string.component.html',
  styleUrls: ['./split-string.component.scss'],
  standalone: true,
  imports: [FormsModule, BsFormModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsListGroupModule, BsSplitStringPipe]
})
export class SplitStringComponent {
  text = '';
}
