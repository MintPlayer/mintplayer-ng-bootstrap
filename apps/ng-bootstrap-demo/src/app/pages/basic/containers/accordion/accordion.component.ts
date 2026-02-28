import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsAccordionModule } from '@mintplayer/ng-bootstrap/accordion';

@Component({
  selector: 'demo-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss'],
  standalone: true,
  imports: [BsAccordionModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccordionComponent {}
