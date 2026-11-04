import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapFormsPage } from '@mintplayer/ui-core/bootstrap/forms';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsPriorityNavComponent, BsPriorityNavItemTemplateDirective, type PriorityNavItem } from '@mintplayer/ng-bootstrap/priority-nav';
import { BsResizableComponent } from '@mintplayer/ng-bootstrap/resizable';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-priority-nav',
  templateUrl: './priority-nav.component.html',
  styleUrls: ['./priority-nav.component.scss'],
  imports: [
    BsCodeSnippetComponent,
    BsPriorityNavComponent,
    BsPriorityNavItemTemplateDirective,
    BsResizableComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityNavComponent {
  constructor() {
    // Raw Bootstrap markup on this page: it installs the verbatim parts itself, never globally (#452).
    useBootstrap(bootstrapFormsPage);
  }

  readonly links: PriorityNavItem[] = [
    { key: 'home',     label: 'Home',     href: '#', priority: 1, hideBelow: 'sm' },
    { key: 'products', label: 'Products', href: '#', priority: 2, hideBelow: 'md' },
    { key: 'services', label: 'Services', href: '#', priority: 3, hideBelow: 'md' },
    { key: 'pricing',  label: 'Pricing',  href: '#', priority: 4, hideBelow: 'lg' },
    { key: 'blog',     label: 'Blog',     href: '#', priority: 5, hideBelow: 'lg' },
    { key: 'careers',  label: 'Careers',  href: '#', priority: 6, hideBelow: 'xl' },
    { key: 'support',  label: 'Support',  href: '#', priority: 7, hideBelow: 'xl' },
    { key: 'contact',  label: 'Contact',  href: '#', priority: 8, hideBelow: 'xl' },
  ];

  readonly actions = toItems(['Edit', 'Duplicate', 'Delete']);
  readonly lastAction = signal<string | null>(null);

  // Labels whose fractional widths made a shrink-wrapped nav flip every frame in Firefox (#428).
  readonly headerActions = toItems(['Refresh', 'Filter', 'Settings']);
  readonly barActions = toItems(['Back', 'Edit', 'Delete']);

  protected readonly snippetHeaderHtml = dedent`
    <!-- No sizing needed: the nav is an ordinary flex item. It is as wide as
         its items when there is room, and collapses into More when there is not. -->
    <div class="card-header d-flex align-items-center gap-2">
      <span class="me-auto">Sites</span>
      <bs-priority-nav label="Site actions" [items]="actions">
        <button *bsPriorityNavItemTemplate="let item" type="button" class="btn btn-sm btn-outline-secondary">{{ item.label }}</button>
      </bs-priority-nav>
      <input type="search" class="form-control form-control-sm" aria-label="Search sites">
    </div>
  `;

  protected readonly snippetActionsHtml = dedent`
    <!-- Nothing to configure: a click on a link or button in the More menu
         closes it. Menu triggers, form fields and disabled items keep it open. -->
    <bs-priority-nav [collapseAt]="'sm'" [items]="actions">
      <button *bsPriorityNavItemTemplate="let item" type="button" class="btn btn-sm btn-outline-secondary"
              (click)="run(item.key)">{{ item.label }}</button>
    </bs-priority-nav>
  `;

  protected readonly snippetBasicHtml = dedent`
    <!-- Without a template every item renders as a link from its label and href. -->
    <bs-priority-nav [items]="links"></bs-priority-nav>

    <!-- Or render each item yourself; the template is used in the strip and in More. -->
    <bs-priority-nav [items]="links">
      <a *bsPriorityNavItemTemplate="let item" class="nav-link" [routerLink]="item.href">{{ item.label }}</a>
    </bs-priority-nav>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import {
      BsPriorityNavComponent,
      BsPriorityNavItemTemplateDirective,
      type PriorityNavItem,
    } from '@mintplayer/ng-bootstrap/priority-nav';

    @Component({
      selector: 'my-priority-nav-demo',
      templateUrl: './my-priority-nav-demo.component.html',
      imports: [BsPriorityNavComponent, BsPriorityNavItemTemplateDirective],
    })
    export class MyPriorityNavDemoComponent {
      // A lower priority stays visible longer; hideBelow is the no-JS fallback.
      protected readonly links: PriorityNavItem[] = [
        { key: 'home',     label: 'Home',     href: '/',         priority: 1, hideBelow: 'sm' },
        { key: 'products', label: 'Products', href: '/products', priority: 2, hideBelow: 'md' },
        { key: 'services', label: 'Services', href: '/services', priority: 3, hideBelow: 'md' },
        { key: 'pricing',  label: 'Pricing',  href: '/pricing',  priority: 4, hideBelow: 'lg' },
      ];
    }
  `;

  protected readonly snippetCollapseAtHtml = dedent`
    <!-- [collapseAt]="'sm'" collapses the entire strip into the More menu
         at the sm breakpoint and below. -->
    <bs-priority-nav [collapseAt]="'sm'" [items]="links"></bs-priority-nav>
  `;
}

/** Equal-priority action items, keyed by their label. */
function toItems(labels: string[]): PriorityNavItem[] {
  return labels.map((label) => ({ key: label, label, priority: 1 }));
}
