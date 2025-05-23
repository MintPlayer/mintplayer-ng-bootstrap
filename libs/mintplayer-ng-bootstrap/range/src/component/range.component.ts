import { Component, ElementRef, Input, ViewChild } from '@angular/core';

@Component({
  selector: 'bs-range',
  templateUrl: './range.component.html',
  styleUrls: ['./range.component.scss'],
  standalone: false,
})
export class BsRangeComponent {
  @ViewChild('slider') slider!: ElementRef<HTMLInputElement>;
  
  @Input() min = 0;
  @Input() max = 10;
  @Input() step = 1;
}
