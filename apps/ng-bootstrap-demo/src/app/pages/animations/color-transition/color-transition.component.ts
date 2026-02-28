import { Component, computed, signal, ChangeDetectionStrategy} from '@angular/core';
import { ColorTransitionAnimation } from '@mintplayer/ng-animations';
import { FormsModule } from '@angular/forms';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-color-transition',
  templateUrl: './color-transition.component.html',
  styleUrls: ['./color-transition.component.scss'],
  animations: [ColorTransitionAnimation],
  standalone: true,
  imports: [FormsModule, BsToggleButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorTransitionComponent {

  state = signal(false);
  currentColor = computed(() => this.state() ? 'color1' : 'color2');
}
