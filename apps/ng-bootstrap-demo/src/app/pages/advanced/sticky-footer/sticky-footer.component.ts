import { Component } from '@angular/core';
import { BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent } from '@mintplayer/ng-bootstrap/accordion';
import { BsGridColumnDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsStickyFooterComponent, BsStickyFooterParentDirective } from '@mintplayer/ng-bootstrap/sticky-footer';

@Component({
  selector: 'demo-sticky-footer',
  templateUrl: './sticky-footer.component.html',
  styleUrls: ['./sticky-footer.component.scss'],
  imports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent, BsStickyFooterComponent, BsStickyFooterParentDirective]
})
export class StickyFooterComponent {
  numbers = [...Array(5).keys()];
}
