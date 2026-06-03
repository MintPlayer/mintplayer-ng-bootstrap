import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import {
  BsNavbarWc,
  BsNavbarItemWc,
  BsNavbarBrandWc,
  BsNavbarDropdownWc,
} from '@mintplayer/ng-bootstrap/navbar-wc';
import { BsDropdownMenuWc, BsDropdownItemWc } from '@mintplayer/ng-bootstrap/dropdown-menu-wc';
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
    BsDropdownMenuWc,
    BsDropdownItemWc,
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
        <bs-dropdown-wc-menu>
          <bs-dropdown-wc-item><a routerLink="/products/widgets">Widgets</a></bs-dropdown-wc-item>
          <bs-dropdown-wc-item><a routerLink="/products/gadgets">Gadgets</a></bs-dropdown-wc-item>
          <bs-dropdown-wc-item><a routerLink="/products/gizmos">Gizmos</a></bs-dropdown-wc-item>
        </bs-dropdown-wc-menu>
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
    import { BsDropdownMenuWc, BsDropdownItemWc } from '@mintplayer/ng-bootstrap/dropdown-menu-wc';
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
        BsDropdownMenuWc,
        BsDropdownItemWc,
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
