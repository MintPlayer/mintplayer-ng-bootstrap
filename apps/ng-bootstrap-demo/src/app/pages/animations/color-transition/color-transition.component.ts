import { Component, signal, computed } from '@angular/core';
import { ColorTransitionAnimation } from '@mintplayer/ng-animations';
import { FormsModule } from '@angular/forms';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-color-transition',
  templateUrl: './color-transition.component.html',
  styleUrls: ['./color-transition.component.scss'],
  animations: [ColorTransitionAnimation],
  standalone: true,
  imports: [FormsModule, BsToggleButtonModule]
})
export class ColorTransitionComponent {

  constructor() {
    this.currentColor = computed(() => {
      return this.stateSignal() ? 'color1' : 'color2';
    });
  }

  //#region state
  stateSignal = signal<boolean>(false);
  get state() {
    return this.stateSignal();
  }
  set state(value: boolean) {
    this.stateSignal.set(value);
  }
  //#endregion

  currentColor;
}
