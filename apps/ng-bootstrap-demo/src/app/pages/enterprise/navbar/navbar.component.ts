import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import {
  BsNavbarComponent,
  BsNavbarNavComponent,
  BsNavbarItemComponent,
  BsNavbarBrandDirective,
  BsNavbarLinkDirective,
} from '@mintplayer/ng-bootstrap/navbar';
import { BsDropdownItemComponent, BsDropdownMenuComponent } from '@mintplayer/ng-bootstrap/dropdown';
import type { NavbarExpandedChangeEventDetail } from '@mintplayer/ui-core/navbar';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-navbar',
  imports: [
    RouterLink,
    BsCodeSnippetComponent,
    BsNavbarComponent,
    BsNavbarNavComponent,
    BsNavbarItemComponent,
    BsNavbarBrandDirective,
    BsDropdownMenuComponent,
    BsDropdownItemComponent,
    BsNavbarLinkDirective,
  ],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  protected readonly expanded = signal(false);

  protected onExpandedchange(detail: NavbarExpandedChangeEventDetail) {
    this.expanded.set(detail.expanded);
  }

  protected readonly snippetHtml = dedent`
    <bs-navbar [breakpoint]="'lg'" [color]="'body-tertiary'" aria-label="Main navigation" (expandedchange)="onExpandedchange($event)">
        <a *bsNavbarBrand routerLink="/">MyApp</a>

      <bs-navbar-nav>
        <bs-navbar-item [active]="true">
          <a routerLink="/">Home</a>
        </bs-navbar-item>
        <bs-navbar-item>
          <a routerLink="/about">About</a>
        </bs-navbar-item>

        <bs-dropdown-menu label="Products">
          <bs-dropdown-item><a routerLink="/products/widgets">Widgets</a></bs-dropdown-item>
          <bs-dropdown-item><a routerLink="/products/gadgets">Gadgets</a></bs-dropdown-item>
          <bs-dropdown-item><a routerLink="/products/gizmos">Gizmos</a></bs-dropdown-item>
        </bs-dropdown-menu>
      </bs-navbar-nav>

      <bs-navbar-nav align="end">
        <bs-navbar-item>
          <a routerLink="/sign-in">Sign in</a>
        </bs-navbar-item>
      </bs-navbar-nav>
    </bs-navbar>
  `;

  protected readonly snippetTs = dedent`
    import { Component, signal } from '@angular/core';
    import { RouterLink } from '@angular/router';
    import {
      BsNavbarComponent,
      BsNavbarNavComponent,
      BsNavbarItemComponent,
      BsNavbarBrandDirective,
      BsNavbarLinkDirective,
    } from '@mintplayer/ng-bootstrap/navbar';
    import { BsDropdownItemComponent, BsDropdownMenuComponent } from '@mintplayer/ng-bootstrap/dropdown';
    import type { NavbarExpandedChangeEventDetail } from '@mintplayer/ui-core/navbar';

    @Component({
      selector: 'my-navbar-demo',
      templateUrl: './my-navbar-demo.component.html',
      imports: [
        RouterLink,
        BsNavbarComponent,
        BsNavbarNavComponent,
        BsNavbarItemComponent,
        BsNavbarBrandDirective,
        BsDropdownMenuComponent,
        BsDropdownItemComponent,
        BsNavbarLinkDirective,
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
