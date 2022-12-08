import { Component } from '@angular/core';
import { Position } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-popover',
  templateUrl: './popover.component.html',
  styleUrls: ['./popover.component.scss']
})
export class PopoverComponent {

  popoverPosition = Position;

}
