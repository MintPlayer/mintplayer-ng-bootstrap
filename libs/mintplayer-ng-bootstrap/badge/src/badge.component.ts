import { Component, Input, signal, computed } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-badge',
  standalone: true,
  templateUrl: './badge.component.html',
  styleUrls: ['./badge.component.scss'],
  imports: []
})
export class BsBadgeComponent {
  constructor() {
    this.colorClass = computed(() => `bg-${this.colors[this.typeSignal()]}`);
  }

  colors = Color;

  //#region Type
  typeSignal = signal<Color>(Color.primary);
  @Input() set type(val: Color) {
    this.typeSignal.set(val);
  }
  //#endregion

  colorClass;
}
