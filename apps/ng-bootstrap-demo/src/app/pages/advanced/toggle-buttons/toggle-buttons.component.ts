import { Component } from '@angular/core';
import { BsNavbarTogglerComponent } from '@mintplayer/ng-bootstrap/navbar-toggler';
import { BsPlaylistTogglerComponent } from '@mintplayer/ng-bootstrap/playlist-toggler';

@Component({
  selector: 'demo-toggle-buttons',
  templateUrl: './toggle-buttons.component.html',
  styleUrls: ['./toggle-buttons.component.scss'],
  imports: [BsNavbarTogglerComponent, BsPlaylistTogglerComponent]
})
export class ToggleButtonsComponent {
  state = false;
}
