import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

@Component({
  selector: 'bs-navbar-toggler',
  templateUrl: './navbar-toggler.component.html',
  styleUrls: ['./navbar-toggler.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsNavbarTogglerComponent {
  state = model<boolean>(false);
  toggleOnClick = input<boolean>(true);
  ariaLabel = input<string>('Toggle navigation');
  controls = input<string | null>(null);

  toggleState() {
    if (this.toggleOnClick()) {
      this.state.update(v => !v);
    }
  }
}
