import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BsBreadcrumbComponent, BsBreadcrumbItemComponent } from '@mintplayer/ng-bootstrap/breadcrumb';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
  imports: [RouterLink, BsCodeSnippetComponent, BsBreadcrumbComponent, BsBreadcrumbItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent {
  protected readonly snippetBasicHtml = dedent`
    <bs-breadcrumb>
      <bs-breadcrumb-item>
        <a [routerLink]="['/']">Home</a>
      </bs-breadcrumb-item>
      <bs-breadcrumb-item>
        <a [routerLink]="['/basic']">Basic</a>
      </bs-breadcrumb-item>
      <bs-breadcrumb-item>
        Breadcrumb
      </bs-breadcrumb-item>
    </bs-breadcrumb>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { RouterLink } from '@angular/router';
    import { BsBreadcrumbComponent, BsBreadcrumbItemComponent } from '@mintplayer/ng-bootstrap/breadcrumb';
    @Component({
      selector: 'my-breadcrumb-demo',
      templateUrl: './my-breadcrumb-demo.component.html',
      imports: [RouterLink, BsBreadcrumbComponent, BsBreadcrumbItemComponent],
    })
    export class MyBreadcrumbDemoComponent {}
  `;
}
