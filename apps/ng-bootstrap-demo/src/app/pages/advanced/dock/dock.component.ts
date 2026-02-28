import { CommonModule } from '@angular/common';
import { Component, signal, viewChild, ChangeDetectionStrategy} from '@angular/core';
import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';
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
  imports: [CommonModule, BsDockModule, BsBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DockComponent {
  readonly dockManager = viewChild(BsDockManagerComponent);

  readonly Color = Color;

  layout = signal<DockLayoutSnapshot>({
    root: {
      kind: 'split',
      direction: 'horizontal',
      sizes: [1, 2],
      children: [
        {
          kind: 'stack',
          panes: ['panel-1', 'panel-2'],
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
            },
            {
              kind: 'stack',
              panes: ['panel-4'],
              activePane: 'panel-4',
            },
          ],
        },
      ],
    },
    floating: [
      {
        id: 'floating-panel-5',
        root: {
          kind: 'stack',
          panes: ['panel-5'],
          activePane: 'panel-5',
        },
        activePane: 'panel-5',
        bounds: { left: 680, top: 96, width: 320, height: 220 },
      },
      {
        id: 'floating-secondary',
        root: {
          kind: 'stack',
          panes: ['panel-floating'],
          activePane: 'panel-floating',
        },
        activePane: 'panel-floating',
        bounds: { left: 520, top: 320, width: 300, height: 210 },
      },
    ],
    titles: {
      'panel-1': 'Panel 1',
      'panel-2': 'Panel 2',
      'panel-3': 'Panel 3',
      'panel-4': 'Panel 4',
      'panel-5': 'Panel 5',
      'panel-floating': 'Floating Utilities',
    },
  });

  liveLayout = signal<DockLayoutSnapshot | undefined>(undefined);
  savedLayout = signal<DockLayoutSnapshot | undefined>(undefined);

  saveLayout(): void {
    if (!this.dockManager()) {
      return;
    }

    this.savedLayout.set(this.dockManager()!.captureLayout());
  }

  onLayoutSnapshot(snapshot: DockLayoutSnapshot): void {
    this.liveLayout.set(snapshot);
  }
}
