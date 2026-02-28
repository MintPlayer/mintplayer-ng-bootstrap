import { Component, computed, signal, ChangeDetectionStrategy} from '@angular/core';
import { ColorTransitionAnimation } from '@mintplayer/ng-animations';
import { FormsModule } from '@angular/forms';
import { BsToggleButtonComponent, BsToggleButtonValueAccessor } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-color-transition',
  templateUrl: './color-transition.component.html',
  styleUrls: ['./color-transition.component.scss'],
  animations: [ColorTransitionAnimation],
  imports: [FormsModule, BsToggleButtonComponent, BsToggleButtonValueAccessor],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorTransitionComponent {

  state = signal(false);
  currentColor = computed(() => this.state() ? 'color1' : 'color2');
}
