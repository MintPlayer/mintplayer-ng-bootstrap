import { Component, computed, model, ChangeDetectionStrategy} from '@angular/core';
import { ColorTransitionAnimation } from '@mintplayer/ng-animations';
import { FormsModule } from '@angular/forms';
import { BsCheckboxComponent } from '@mintplayer/ng-bootstrap/checkbox';

@Component({
  selector: 'demo-color-transition',
  templateUrl: './color-transition.component.html',
  styleUrls: ['./color-transition.component.scss'],
  animations: [ColorTransitionAnimation],
  imports: [FormsModule, BsCheckboxComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColorTransitionComponent {

  state = model(false);
  currentColor = computed(() => this.state() ? 'color1' : 'color2');
}
