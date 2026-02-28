import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

@Component({
  selector: 'bs-playlist-toggler',
  templateUrl: './playlist-toggler.component.html',
  styleUrls: ['./playlist-toggler.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(click)': 'toggleState($event)',
  },
})
export class BsPlaylistTogglerComponent {
  state = model<boolean>(false);
  toggleOnClick = input(true);

  toggleState(ev: MouseEvent) {
    if (this.toggleOnClick()) {
      this.state.update(v => !v);
    }
  }
}
