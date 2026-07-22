import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import {
  BsNavbarWc,
  BsNavbarItemWc,
  BsNavbarBrandWc,
  BsNavbarDropdownWc,
} from '@mintplayer/ng-bootstrap/navbar-wc';
import { BsDropdownMenuComponent, BsDropdownItemDirective } from '@mintplayer/ng-bootstrap/dropdown-menu';
import type { NavbarExpandedChangeEventDetail } from '@mintplayer/web-components/navbar';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-navbar-wc',
  imports: [
    RouterLink,
    BsCodeSnippetComponent,
    BsNavbarWc,
    BsNavbarItemWc,
    BsNavbarBrandWc,
    BsNavbarDropdownWc,
    BsDropdownMenuComponent,
    BsDropdownItemDirective,
  ],
  templateUrl: './navbar-wc.component.html',
  styleUrl: './navbar-wc.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarWcComponent {
  protected readonly expanded = signal(false);

  protected onExpandedchange(detail: NavbarExpandedChangeEventDetail) {
    this.expanded.set(detail.expanded);
  }

  protected readonly snippetHtml = dedent`
    <bs-navbar-wc [breakpoint]="'lg'" [color]="'body-tertiary'" [ariaLabel]="'Main navigation'" (expandedchange)="onExpandedchange($event)">
      <bs-navbar-wc-brand>
        <a routerLink="/">MyApp</a>
      </bs-navbar-wc-brand>

      <bs-navbar-wc-item [active]="true">
        <a routerLink="/">Home</a>
      </bs-navbar-wc-item>
      <bs-navbar-wc-item>
        <a routerLink="/about">About</a>
      </bs-navbar-wc-item>

      <bs-navbar-wc-dropdown [label]="'Products'">
        <bs-dropdown-menu>
          <li bsDropdownItem><a routerLink="/products/widgets">Widgets</a></li>
          <li bsDropdownItem><a routerLink="/products/gadgets">Gadgets</a></li>
          <li bsDropdownItem><a routerLink="/products/gizmos">Gizmos</a></li>
        </bs-dropdown-menu>
      </bs-navbar-wc-dropdown>

      <bs-navbar-wc-item slot="end">
        <a routerLink="/sign-in">Sign in</a>
      </bs-navbar-wc-item>
    </bs-navbar-wc>
  `;

  protected readonly snippetTs = dedent`
    import { Component, signal } from '@angular/core';
    import { RouterLink } from '@angular/router';
    import {
      BsNavbarWc,
      BsNavbarItemWc,
      BsNavbarBrandWc,
      BsNavbarDropdownWc,
    } from '@mintplayer/ng-bootstrap/navbar-wc';
    import { BsDropdownMenuComponent, BsDropdownItemDirective } from '@mintplayer/ng-bootstrap/dropdown-menu';
    import type { NavbarExpandedChangeEventDetail } from '@mintplayer/web-components/navbar';

    @Component({
      selector: 'my-navbar-demo',
      templateUrl: './my-navbar-demo.component.html',
      imports: [
        RouterLink,
        BsNavbarWc,
        BsNavbarItemWc,
        BsNavbarBrandWc,
        BsNavbarDropdownWc,
        BsDropdownMenuComponent,
        BsDropdownItemDirective,
      ],
    })
    export class MyNavbarDemoComponent {
      readonly expanded = signal(false);

      onExpandedchange(detail: NavbarExpandedChangeEventDetail) {
        this.expanded.set(detail.expanded);
      }
    }
  `;
}
