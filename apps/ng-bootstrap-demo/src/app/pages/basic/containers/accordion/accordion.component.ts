import { Component } from '@angular/core';
import { BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent } from '@mintplayer/ng-bootstrap/accordion';

@Component({
  selector: 'demo-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss'],
  imports: [BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent]
})
export class AccordionComponent {}
