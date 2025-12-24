import { ChangeDetectionStrategy, Component, HostListener, input, model } from '@angular/core';

@Component({
  selector: 'bs-navbar-toggler',
  templateUrl: './navbar-toggler.component.html',
  styleUrls: ['./navbar-toggler.component.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsNavbarTogglerComponent {
  state = model<boolean>(false);
  toggleOnClick = input<boolean>(true);

  @HostListener('click', ['$event'])
  toggleState(ev: MouseEvent) {
    if (this.toggleOnClick()) {
      this.state.update(v => !v);
    }
  }
}
