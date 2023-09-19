import { Component } from '@angular/core';

@Component({
  selector: 'demo-sticky-footer',
  templateUrl: './sticky-footer.component.html',
  styleUrls: ['./sticky-footer.component.scss']
})
export class StickyFooterComponent {
  numbers = [...Array(5).keys()];
}
