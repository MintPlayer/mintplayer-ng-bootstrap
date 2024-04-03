import { Component } from '@angular/core';
import { BsAccordionModule } from '@mintplayer/ng-bootstrap/accordion';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsStickyFooterModule } from '@mintplayer/ng-bootstrap/sticky-footer';

@Component({
  selector: 'demo-sticky-footer',
  templateUrl: './sticky-footer.component.html',
  styleUrls: ['./sticky-footer.component.scss'],
  standalone: true,
  imports: [BsGridModule, BsAccordionModule, BsStickyFooterModule]
})
export class StickyFooterComponent {
  numbers = [...Array(5).keys()];
}
