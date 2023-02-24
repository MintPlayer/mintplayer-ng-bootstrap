import { Component, HostBinding } from '@angular/core';

@Component({
  selector: 'bs-dock-container',
  templateUrl: './dock-container.component.html',
  styleUrls: ['./dock-container.component.scss'],
})
export class BsDockContainerComponent {
  @HostBinding('class.position-relative') positionRelativeClass = true;
}
