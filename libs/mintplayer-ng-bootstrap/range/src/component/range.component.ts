import { Component, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'bs-range',
  templateUrl: './range.component.html',
  styleUrls: ['./range.component.scss'],
})
export class BsRangeComponent {
  constructor() {}

  @ViewChild('slider') slider!: ElementRef<HTMLInputElement>;
}
