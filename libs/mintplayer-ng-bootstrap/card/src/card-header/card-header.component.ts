import { Component, Input } from '@angular/core';

@Component({
  selector: 'bs-card-header',
  templateUrl: './card-header.component.html',
  styleUrls: ['./card-header.component.scss']
})
export class BsCardHeaderComponent {
  @Input() noPadding = false;
}
