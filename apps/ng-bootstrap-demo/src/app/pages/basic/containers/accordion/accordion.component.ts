import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent } from '@mintplayer/ng-bootstrap/accordion';

@Component({
  selector: 'demo-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss'],
  standalone: true,
  imports: [BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccordionComponent {}
