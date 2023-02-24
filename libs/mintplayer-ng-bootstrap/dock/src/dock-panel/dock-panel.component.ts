import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'bs-dock-panel',
  templateUrl: './dock-panel.component.html',
  styleUrls: ['./dock-panel.component.scss'],
})
export class BsDockPanelComponent {
  @HostBinding('class.d-block') dBlockClass = true;
}
