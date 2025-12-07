import { Component, Input, signal, computed } from '@angular/core';
import { Breakpoint } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-grid',
  templateUrl: './grid.component.html',
  styleUrls: ['./grid.component.scss'],
  standalone: false,
})
export class BsGridComponent {

  constructor() {
    this.containerClass = computed(() => {
      const stopFullWidthAt = this.stopFullWidthAtSignal();
      switch (stopFullWidthAt) {
        case 'sm': return 'container';
        case 'never': return 'container-fluid';
        default: return `container-${stopFullWidthAt}`;
      }
    });
  }

  //#region StopFullWidthAt
  stopFullWidthAtSignal = signal<Breakpoint | 'never'>('sm');
  @Input() set stopFullWidthAt(val: Breakpoint | 'never') {
    this.stopFullWidthAtSignal.set(val);
  }
  //#endregion

  containerClass;
}
