import { Component, ViewChild } from '@angular/core';
import { BsDockPanelComponent } from '@mintplayer/ng-bootstrap/dock';

@Component({
  selector: 'demo-dock',
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.scss']
})
export class DockComponent {
  @ViewChild('dockPanel') dockPanel!: BsDockPanelComponent;
  toggleAttached() {
    if (this.dockPanel) {
      this.dockPanel.toggleAttached();
    }
  }
}
