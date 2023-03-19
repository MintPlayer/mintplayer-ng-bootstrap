import { Component, Input } from '@angular/core';

@Component({
  selector: 'bs-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.scss']
})
export class BsCardComponent {
  @Input() rounded = true;
}
