import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsPriorityNavComponent, BsPriorityNavItemDirective } from '@mintplayer/ng-bootstrap/priority-nav';
import { BsResizableComponent } from '@mintplayer/ng-bootstrap/resizable';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-priority-nav',
  templateUrl: './priority-nav.component.html',
  styleUrls: ['./priority-nav.component.scss'],
  imports: [
    BsCodeSnippetComponent,
    BsPriorityNavComponent,
    BsPriorityNavItemDirective,
    BsResizableComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityNavComponent {
  links = [
    { label: 'Home',     priority: 1, hideBelow: 'sm' as const },
    { label: 'Products', priority: 2, hideBelow: 'md' as const },
    { label: 'Services', priority: 3, hideBelow: 'md' as const },
    { label: 'Pricing',  priority: 4, hideBelow: 'lg' as const },
    { label: 'Blog',     priority: 5, hideBelow: 'lg' as const },
    { label: 'Careers',  priority: 6, hideBelow: 'xl' as const },
    { label: 'Support',  priority: 7, hideBelow: 'xl' as const },
    { label: 'Contact',  priority: 8, hideBelow: 'xl' as const },
  ];

  protected readonly snippetBasicHtml = dedent`
    <bs-priority-nav>
      @for (link of links; track link.label) {
        <a *bsPriorityNavItem="link.priority; hideBelow: link.hideBelow"
           href="#">
          {{ link.label }}
        </a>
      }
    </bs-priority-nav>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import {
      BsPriorityNavComponent,
      BsPriorityNavItemDirective,
    } from '@mintplayer/ng-bootstrap/priority-nav';

    @Component({
      selector: 'my-priority-nav-demo',
      templateUrl: './my-priority-nav-demo.component.html',
      imports: [BsPriorityNavComponent, BsPriorityNavItemDirective],
    })
    export class MyPriorityNavDemoComponent {
      protected readonly links = [
        { label: 'Home',     priority: 1, hideBelow: 'sm' as const },
        { label: 'Products', priority: 2, hideBelow: 'md' as const },
        { label: 'Services', priority: 3, hideBelow: 'md' as const },
        { label: 'Pricing',  priority: 4, hideBelow: 'lg' as const },
      ];
    }
  `;

  protected readonly snippetCollapseAtHtml = dedent`
    <!-- [collapseAt]="'sm'" collapses the entire strip into the More menu
         at the sm breakpoint and below. -->
    <bs-priority-nav [collapseAt]="'sm'">
      @for (link of links; track link.label) {
        <a *bsPriorityNavItem="link.priority" href="#">{{ link.label }}</a>
      }
    </bs-priority-nav>
  `;
}
