import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import {
  BsDockManagerComponent,
  BsDockModule,
  DockLayoutSnapshot,
} from '@mintplayer/ng-bootstrap/dock';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-dock',
  templateUrl: './dock.component.html',
  styleUrls: ['./dock.component.scss'],
  standalone: true,
  imports: [CommonModule, BsDockModule, BsBadgeComponent, BsButtonTypeDirective],
})
export class DockComponent {
  @ViewChild(BsDockManagerComponent) dockManager?: BsDockManagerComponent;

  readonly Color = Color;

  layout: DockLayoutSnapshot = {
    root: {
      kind: 'split',
      direction: 'horizontal',
      sizes: [1, 2],
      children: [
        {
          kind: 'stack',
          panes: ['panel-1', 'panel-2'],
          titles: {
            'panel-1': 'Panel 1',
            'panel-2': 'Panel 2',
          },
          activePane: 'panel-1',
        },
        {
          kind: 'split',
          direction: 'vertical',
          sizes: [2, 1],
          children: [
            {
              kind: 'stack',
              panes: ['panel-3'],
              titles: {
                'panel-3': 'Panel 3',
              },
            },
            {
              kind: 'stack',
              panes: ['panel-4'],
              titles: {
                'panel-4': 'Panel 4',
              },
              activePane: 'panel-4',
            },
          ],
        },
      ],
    },
    floating: [
      {
        id: 'floating-panel-5',
        panes: ['panel-5'],
        titles: {
          'panel-5': 'Panel 5',
        },
        activePane: 'panel-5',
        bounds: { left: 680, top: 96, width: 320, height: 220 },
      },
      {
        id: 'floating-secondary',
        panes: ['panel-floating'],
        titles: {
          'panel-floating': 'Floating Utilities',
        },
        activePane: 'panel-floating',
        bounds: { left: 520, top: 320, width: 300, height: 210 },
      },
    ],
  };

  liveLayout?: DockLayoutSnapshot;
  savedLayout?: DockLayoutSnapshot;

  saveLayout(): void {
    if (!this.dockManager) {
      return;
    }

    this.savedLayout = this.dockManager.captureLayout();
  }

  onLayoutSnapshot(snapshot: DockLayoutSnapshot): void {
    this.liveLayout = snapshot;
  }
}
