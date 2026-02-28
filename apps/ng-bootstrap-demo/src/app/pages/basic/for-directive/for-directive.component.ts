import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';

@Component({
  selector: 'demo-for-directive',
  templateUrl: './for-directive.component.html',
  styleUrls: ['./for-directive.component.scss'],
  standalone: true,
  imports: [BsForDirective, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsColFormLabelDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForDirectiveComponent {}
