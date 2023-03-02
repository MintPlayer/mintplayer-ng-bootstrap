import { Component, ViewChild } from '@angular/core';
import { BsDockPanelComponent } from '@mintplayer/ng-bootstrap/dock';

@Component({
  selector: 'demo-dock',
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.scss']
})
export class DockComponent {
  @ViewChild('dockPanel1') dockPanel1!: BsDockPanelComponent;
  toggleAttached() {
    if (this.dockPanel1) {
      this.dockPanel1.toggleAttached();
    }
  }
}
