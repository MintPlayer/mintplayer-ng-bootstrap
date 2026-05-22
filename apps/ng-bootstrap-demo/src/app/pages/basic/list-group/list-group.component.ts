import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-list-group',
  templateUrl: './list-group.component.html',
  styleUrls: ['./list-group.component.scss'],
  imports: [BsCodeSnippetComponent, BsListGroupComponent, BsListGroupItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListGroupComponent {

  protected readonly snippetBasicHtml = dedent`
    <bs-list-group>
      <bs-list-group-item>Cras justo odio</bs-list-group-item>
      <bs-list-group-item>Dapibus ac facilisis in</bs-list-group-item>
      <bs-list-group-item>Morbi leo risus</bs-list-group-item>
    </bs-list-group>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
    @Component({
      selector: 'my-list-group-demo',
      templateUrl: './my-list-group-demo.component.html',
      imports: [BsListGroupComponent, BsListGroupItemComponent],
    })
    export class MyListGroupDemoComponent {}
  `;
}
