import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsPopoverDirective, BsPopoverHeaderDirective, BsPopoverBodyDirective } from '@mintplayer/ng-bootstrap/popover';

@Component({
  selector: 'demo-popover',
  templateUrl: './popover.component.html',
  styleUrls: ['./popover.component.scss'],
  imports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsPopoverDirective, BsPopoverHeaderDirective, BsPopoverBodyDirective, BsButtonTypeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PopoverComponent {
  colors = Color;
}
