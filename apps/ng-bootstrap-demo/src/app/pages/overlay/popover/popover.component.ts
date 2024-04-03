import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsPopoverModule } from '@mintplayer/ng-bootstrap/popover';

@Component({
  selector: 'demo-popover',
  templateUrl: './popover.component.html',
  styleUrls: ['./popover.component.scss'],
  standalone: true,
  imports: [BsGridModule, BsPopoverModule, BsButtonTypeDirective]
})
export class PopoverComponent {
  colors = Color;
}
