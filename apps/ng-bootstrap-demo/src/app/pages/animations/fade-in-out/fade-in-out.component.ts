import { Component, signal, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsToggleButtonComponent, BsToggleButtonValueAccessor } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-fade-in-out',
  templateUrl: './fade-in-out.component.html',
  styleUrls: ['./fade-in-out.component.scss'],
  animations: [FadeInOutAnimation],
  standalone: true,
  imports: [FormsModule, BsButtonTypeDirective, BsToggleButtonComponent, BsToggleButtonValueAccessor],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FadeInOutComponent {
  colors = Color;
  fadeInOutState = signal(false);
}
