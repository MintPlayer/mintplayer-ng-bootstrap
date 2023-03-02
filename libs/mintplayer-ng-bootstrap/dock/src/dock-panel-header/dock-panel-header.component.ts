import { DomPortal } from '@angular/cdk/portal';
import { Component } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-dock-panel-header',
  templateUrl: './dock-panel-header.component.html',
  styleUrls: ['./dock-panel-header.component.scss'],
})
export class BsDockPanelHeaderComponent {
  colors = Color;
}
