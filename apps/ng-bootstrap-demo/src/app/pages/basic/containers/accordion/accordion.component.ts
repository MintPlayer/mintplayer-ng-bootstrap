import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderDirective } from '@mintplayer/ng-bootstrap/accordion';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss'],
  imports: [BsCodeSnippetComponent, BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccordionComponent {
  protected readonly snippetBasicHtml = dedent`
    <bs-accordion class="d-block" [highlightActiveTab]="true">
      <bs-accordion-tab>
        <ng-container *bsAccordionTabHeader>Profile</ng-container>
        <span class="d-block px-3 py-2">Profile content</span>
      </bs-accordion-tab>
      <bs-accordion-tab>
        <ng-container *bsAccordionTabHeader>Sign in</ng-container>
        <span class="d-block px-3 py-2">Sign-in content</span>
      </bs-accordion-tab>
      <bs-accordion-tab>
        <ng-container *bsAccordionTabHeader>Payment</ng-container>
        <span class="d-block px-3 py-2">Payment content</span>
      </bs-accordion-tab>
    </bs-accordion>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import {
      BsAccordionComponent,
      BsAccordionTabComponent,
      BsAccordionTabHeaderDirective,
    } from '@mintplayer/ng-bootstrap/accordion';

    @Component({
      selector: 'my-accordion-demo',
      templateUrl: './my-accordion-demo.component.html',
      imports: [
        BsAccordionComponent,
        BsAccordionTabComponent,
        BsAccordionTabHeaderDirective,
      ],
    })
    export class MyAccordionDemoComponent {}
  `;

  protected readonly snippetSingleHtml = dedent`
    <!-- [highlightActiveTab]="true" visually marks the open tab; default
         single-open behaviour means opening one closes the others. -->
    <bs-accordion class="d-block" [highlightActiveTab]="true">
      <bs-accordion-tab>
        <ng-container *bsAccordionTabHeader>Profile</ng-container>
        <span class="d-block px-3 py-2">Profile content</span>
      </bs-accordion-tab>
      <bs-accordion-tab>
        <ng-container *bsAccordionTabHeader>Sign in</ng-container>
        <span class="d-block px-3 py-2">Sign-in content</span>
      </bs-accordion-tab>
    </bs-accordion>
  `;

  protected readonly snippetMultiHtml = dedent`
    <!-- [multi]="true" lets several tabs stay open simultaneously. -->
    <bs-accordion class="d-block" [multi]="true">
      <bs-accordion-tab>
        <ng-container *bsAccordionTabHeader>Profile</ng-container>
        <span class="d-block px-3 py-2">Profile content</span>
      </bs-accordion-tab>
      <bs-accordion-tab>
        <ng-container *bsAccordionTabHeader>Sign in</ng-container>
        <span class="d-block px-3 py-2">Sign-in content</span>
      </bs-accordion-tab>
    </bs-accordion>
  `;

  protected readonly snippetMultiLevelHtml = dedent`
    <!-- Nest accordions inside tabs to build a tree. -->
    <bs-accordion class="d-block">
      <bs-accordion-tab>
        <ng-container *bsAccordionTabHeader>Profile</ng-container>
        <bs-accordion class="d-block">
          <bs-accordion-tab>
            <ng-container *bsAccordionTabHeader>Email</ng-container>
            <span class="d-block px-3 py-2">info&#64;example.com</span>
          </bs-accordion-tab>
          <bs-accordion-tab>
            <ng-container *bsAccordionTabHeader>Username</ng-container>
            <span class="d-block px-3 py-2">user-name</span>
          </bs-accordion-tab>
        </bs-accordion>
      </bs-accordion-tab>
    </bs-accordion>
  `;
}
