import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

@Component({
  selector: 'bs-navbar-toggler',
  templateUrl: './navbar-toggler.component.html',
  styleUrls: ['./navbar-toggler.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(click)': 'toggleState($event)',
  },
})
export class BsNavbarTogglerComponent {
  state = model<boolean>(false);
  toggleOnClick = input<boolean>(true);

  toggleState(ev: MouseEvent) {
    if (this.toggleOnClick()) {
      this.state.update(v => !v);
    }
  }
}
