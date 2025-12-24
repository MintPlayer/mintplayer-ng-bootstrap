import { ChangeDetectionStrategy, Component, effect, HostListener, input, model, output, signal } from '@angular/core';

@Component({
  selector: 'bs-playlist-toggler',
  standalone: true,
  templateUrl: './playlist-toggler.component.html',
  styleUrls: ['./playlist-toggler.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsPlaylistTogglerComponent {
  state = model<boolean>(false);
  stateChange = output<boolean>();
  toggleOnClick = input(true);

  private previousState: boolean | undefined;

  constructor() {
    effect(() => {
      const currentState = this.state();
      if (currentState !== this.previousState) {
        this.previousState = currentState;
        this.stateChange.emit(currentState);
      }
    });
  }

  @HostListener('click', ['$event'])
  toggleState(ev: MouseEvent) {
    if (this.toggleOnClick()) {
      this.state.set(!this.state());
    }
  }
}
