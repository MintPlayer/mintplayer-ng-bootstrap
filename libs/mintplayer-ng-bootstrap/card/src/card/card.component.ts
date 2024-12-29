import { Component, Input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'bs-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss'],
  standalone: false,
  encapsulation: ViewEncapsulation.None,
})
export class BsCardComponent {
  @Input() rounded = true;
}
