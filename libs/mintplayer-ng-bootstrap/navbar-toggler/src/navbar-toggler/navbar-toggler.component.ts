import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapNavbar } from '@mintplayer/ui-core/bootstrap/navbar';

@Component({
  selector: 'bs-navbar-toggler',
  templateUrl: './navbar-toggler.component.html',
  styleUrls: ['./navbar-toggler.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsNavbarTogglerComponent {
  constructor() {
    // #452: the navbar partial ships with this component, scoped to the elements it stamps (data-mps="navbar").
    useBootstrap(bootstrapNavbar);
  }

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
