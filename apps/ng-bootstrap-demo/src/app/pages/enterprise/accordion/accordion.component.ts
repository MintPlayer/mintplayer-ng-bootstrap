import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import {
  BsAccordionComponent,
  BsAccordionTabComponent,
  BsAccordionTabHeaderDirective,
} from '@mintplayer/ng-bootstrap/accordion';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-accordion',
  templateUrl: './accordion.component.html',
  styleUrls: ['./accordion.component.scss'],
  imports: [
    BsCodeSnippetComponent,
    BsAccordionComponent,
    BsAccordionTabComponent,
    BsAccordionTabHeaderDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccordionComponent {
  protected readonly profileOpen = signal(false);

  protected readonly snippetBasicHtml = dedent`
    <bs-accordion [highlightActiveTab]="true">
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
    <bs-accordion [highlightActiveTab]="true">
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
    <!-- [multi]="true" lets several tabs stay open simultaneously. With
         JavaScript disabled that is a checkbox state machine instead of a
         radio one — the accordion stays interactive either way. -->
    <bs-accordion [multi]="true">
      <bs-accordion-tab [(isActive)]="profileOpen">
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
    <!-- Nest accordions inside tabs to build a tree. Closing a tab
         collapses every accordion inside it, at any depth. -->
    <bs-accordion>
      <bs-accordion-tab>
        <ng-container *bsAccordionTabHeader>Profile</ng-container>
        <bs-accordion>
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

  protected readonly snippetThemingScss = dedent`
    /* The chrome lives in the web component's shadow root, so page CSS
       reaches it through the Bootstrap custom properties and ::part() —
       ::ng-deep no longer applies. */
    .multi-level {
      --bs-accordion-btn-bg: #333;
      --bs-accordion-btn-color: #fff;
      --bs-accordion-active-bg: #444;
      --bs-accordion-active-color: #fff;
    }

    .multi-level::part(content) {
      background-color: #ccc;
    }
  `;
}
