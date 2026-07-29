import { ChangeDetectionStrategy, Component } from '@angular/core';
import { BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderDirective } from '@mintplayer/ng-bootstrap/accordion';

/**
 * THROWAWAY — spike 0.1b (screen-reader a11y plan, Phase 0). Renders the
 * shipping bs-accordion next to the <details name>-based variant D1 will
 * ship, with identical content, so a Playwright pixel diff can judge parity.
 * Not linked from the nav; deleted before merge.
 */
@Component({
  selector: 'demo-spike-accordion-parity',
  templateUrl: './spike-accordion-parity.component.html',
  styleUrls: ['./spike-accordion-parity.component.scss'],
  imports: [BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpikeAccordionParityComponent {}
