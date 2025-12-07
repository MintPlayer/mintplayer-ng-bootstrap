import { Component, Input, OnInit, signal, computed } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.scss'],
  standalone: true,
  imports: [],
})
export class BsSpinnerComponent implements OnInit {
  constructor() {
    this.spinnerClass = computed(() => `spinner-${this.typeSignal()}`);
    this.colorClass = computed(() => `text-${this.colors[this.colorSignal()]}`);
  }

  spinnerClass;
  colorClass;
  colors = Color;

  ngOnInit(): void {}

  //#region Type
  typeSignal = signal<'border' | 'grow'>('border');
  @Input() set type(val: 'border' | 'grow') {
    this.typeSignal.set(val);
  }
  //#endregion
  //#region Color
  colorSignal = signal<Color>(Color.dark);
  @Input() set color(val: Color) {
    this.colorSignal.set(val);
  }
  //#endregion
}
