import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Breakpoint } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsGridComponent {

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
