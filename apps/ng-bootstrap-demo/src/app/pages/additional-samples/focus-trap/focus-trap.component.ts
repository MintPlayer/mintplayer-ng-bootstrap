import { A11yModule } from '@angular/cdk/a11y';
import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCloseComponent } from '@mintplayer/ng-bootstrap/close';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsModalModule } from '@mintplayer/ng-bootstrap/modal';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';

@Component({
  selector: 'demo-focus-trap',
  templateUrl: './focus-trap.component.html',
  styleUrls: ['./focus-trap.component.scss'],
  standalone: true,
  imports: [A11yModule, BsForDirective, BsFormModule, BsGridModule, BsCloseComponent, BsModalModule, BsButtonTypeDirective, FocusOnLoadDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FocusTrapComponent {

  isOpen = false;
  colors = Color;

}
