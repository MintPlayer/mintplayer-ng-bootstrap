import { Component, Input } from '@angular/core';
import { BsAccordionComponent } from '@mintplayer/ng-bootstrap/accordion';

@Component({
  selector: 'bs-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss'],
  providers: [
    { provide: BsAccordionComponent, useExisting: BsAccordionMockComponent }
  ],
})
export class BsAccordionMockComponent {
  @Input() highlightActiveTab = false;
}
