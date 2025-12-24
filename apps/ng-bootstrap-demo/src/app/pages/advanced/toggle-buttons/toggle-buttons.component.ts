import { Component, signal } from '@angular/core';
import { BsNavbarTogglerComponent } from '@mintplayer/ng-bootstrap/navbar-toggler';
import { BsPlaylistTogglerComponent } from '@mintplayer/ng-bootstrap/playlist-toggler';

@Component({
  selector: 'demo-toggle-buttons',
  templateUrl: './toggle-buttons.component.html',
  styleUrls: ['./toggle-buttons.component.scss'],
  standalone: true,
  imports: [BsNavbarTogglerComponent, BsPlaylistTogglerComponent]
})
export class ToggleButtonsComponent {
  state = signal(false);
}
