import { Component, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCalendarComponent } from '@mintplayer/ng-bootstrap/calendar';
import { BsDropdownModule } from '@mintplayer/ng-bootstrap/dropdown';

@Component({
  selector: 'demo-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss'],
  standalone: true,
  imports: [BsCalendarComponent, BsDropdownModule, BsButtonTypeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownComponent {
  colors = Color;
}
