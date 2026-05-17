import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent } from '@mintplayer/ng-bootstrap/accordion';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss'],
  imports: [BsCodeSnippetComponent, BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccordionComponent {
  protected readonly snippetBasicHtml = dedent`
    <bs-accordion class="d-block" [highlightActiveTab]="true">
      <bs-accordion-tab>
        <bs-accordion-tab-header>Profile</bs-accordion-tab-header>
        <span class="d-block px-3 py-2">Profile content</span>
      </bs-accordion-tab>
      <bs-accordion-tab>
        <bs-accordion-tab-header>Sign in</bs-accordion-tab-header>
        <span class="d-block px-3 py-2">Sign-in content</span>
      </bs-accordion-tab>
      <bs-accordion-tab>
        <bs-accordion-tab-header>Payment</bs-accordion-tab-header>
        <span class="d-block px-3 py-2">Payment content</span>
      </bs-accordion-tab>
    </bs-accordion>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import {
      BsAccordionComponent,
      BsAccordionTabComponent,
      BsAccordionTabHeaderComponent,
    } from '@mintplayer/ng-bootstrap/accordion';

    @Component({
      selector: 'my-accordion-demo',
      templateUrl: './my-accordion-demo.component.html',
      imports: [
        BsAccordionComponent,
        BsAccordionTabComponent,
        BsAccordionTabHeaderComponent,
      ],
    })
    export class MyAccordionDemoComponent {}
  `;
}
