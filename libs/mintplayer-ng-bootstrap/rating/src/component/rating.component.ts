import { Component, EventEmitter, HostListener, Input, Output, signal, computed, effect } from '@angular/core';

@Component({
  selector: 'bs-rating',
  standalone: true,
  templateUrl: './rating.component.html',
  styleUrls: ['./rating.component.scss'],
  imports: [],
})
export class BsRatingComponent {

  constructor() {
    this.stars = computed(() => {
      const maximum = this.maximumSignal();
      const previewValue = this.previewValue();
      const value = this.valueSignal();
      const v = previewValue ?? value;
      return [
        ...[...Array(v).keys()].map(i => true),
        ...[...Array(maximum - v).keys()].map(i => false)
      ];
    });

    effect(() => {
      const previewValue = this.previewValue();
      const value = this.valueSignal();
      const v = previewValue ?? value;
      this.starsChange.emit(v);
    });
  }

  maximumSignal = signal<number>(5);
  @Input() set maximum(val: number) {
    this.maximumSignal.set(val);
  }
  get maximum() {
    return this.maximumSignal();
  }

  valueSignal = signal<number>(3);
  @Input() set value(val: number) {
    this.valueSignal.set(val);
  }
  get value() {
    return this.valueSignal();
  }

  previewValue = signal<number | null>(null);
  stars;

  //#region Value
  @Output() public valueChange = new EventEmitter<number>();
  @Output() public starsChange = new EventEmitter<number>();
  //#endregion

  hoverValue(index: number) {
    this.previewValue.set(index + 1);
  }
  selectValue(index: number) {
    this.valueSignal.set(index + 1);
    this.valueChange.emit(index + 1);
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.previewValue.set(null);
  }
}
