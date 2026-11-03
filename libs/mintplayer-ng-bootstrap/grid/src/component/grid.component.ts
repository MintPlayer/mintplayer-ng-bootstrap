import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Breakpoint } from '@mintplayer/ng-bootstrap';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapContainers } from '@mintplayer/ui-core/bootstrap/containers';
import { bootstrapGrid } from '@mintplayer/ui-core/bootstrap/grid';

@Component({
  selector: 'bs-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsGridComponent {
  constructor() {
    // #452: the container and grid partials ship with the grid, scoped to the
    // elements it (and the bsRow / column directives) stamp with data-mps.
    useBootstrap(bootstrapContainers, bootstrapGrid);
  }

  stopFullWidthAt = input<Breakpoint | 'never'>('sm');

  containerClass = computed(() => {
    const stopFullWidthAt = this.stopFullWidthAt();
    switch (stopFullWidthAt) {
      case 'sm': return 'container';
      case 'never': return 'container-fluid';
      default: return `container-${stopFullWidthAt}`;
    }
  });
}
