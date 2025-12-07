import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'bs-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
  standalone: true,
  imports: []
})
export class BsTableComponent {

  //#region isResponsive
  isResponsiveSignal = signal<boolean>(false);
  @Input() set isResponsive(val: boolean) {
    this.isResponsiveSignal.set(val);
  }
  //#endregion
  //#region striped
  stripedSignal = signal<boolean>(false);
  @Input() set striped(val: boolean) {
    this.stripedSignal.set(val);
  }
  //#endregion
  //#region hover
  hoverSignal = signal<boolean>(false);
  @Input() set hover(val: boolean) {
    this.hoverSignal.set(val);
  }
  //#endregion
}
