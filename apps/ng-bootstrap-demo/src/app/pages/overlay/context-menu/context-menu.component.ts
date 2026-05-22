import { Component, ChangeDetectionStrategy } from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsContextMenuDirective } from '@mintplayer/ng-bootstrap/context-menu';
import { BsDropdownMenuComponent, BsDropdownItemComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss'],
  imports: [BsCodeSnippetComponent, BsDropdownMenuComponent, BsDropdownItemComponent, BsContextMenuDirective, BsHasOverlayComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextMenuComponent {

  protected readonly snippetBasicHtml = dedent`
    <div class="target-area">
      Right-click me
      <bs-dropdown-menu *bsContextMenu>
        <bs-dropdown-item>Cut</bs-dropdown-item>
        <bs-dropdown-item>Copy</bs-dropdown-item>
        <bs-dropdown-item>Paste</bs-dropdown-item>
      </bs-dropdown-menu>
    </div>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsContextMenuDirective } from '@mintplayer/ng-bootstrap/context-menu';
    import { BsDropdownMenuComponent, BsDropdownItemComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';
    @Component({
      selector: 'my-context-menu-demo',
      templateUrl: './my-context-menu-demo.component.html',
      imports: [BsContextMenuDirective, BsDropdownMenuComponent, BsDropdownItemComponent],
    })
    export class MyContextMenuDemoComponent {}
  `;
}
