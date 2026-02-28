import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsInputGroupComponent } from '@mintplayer/ng-bootstrap/input-group';

@Component({
  selector: 'demo-input-group',
  templateUrl: './input-group.component.html',
  styleUrls: ['./input-group.component.scss'],
  standalone: true,
  imports: [BsFormModule, BsInputGroupComponent, BsButtonTypeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputGroupComponent {
  colors = Color;
}
