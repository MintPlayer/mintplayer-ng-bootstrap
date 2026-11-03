import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsContextMenuDirective } from '@mintplayer/ng-bootstrap/context-menu';
import { BsDropdownDividerComponent, BsDropdownItemComponent, BsDropdownMenuComponent } from '@mintplayer/ng-bootstrap/dropdown';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-context-menu',
  templateUrl: './context-menu.component.html',
  styleUrls: ['./context-menu.component.scss'],
  imports: [BsCodeSnippetComponent, BsDropdownMenuComponent, BsDropdownItemComponent, BsDropdownDividerComponent, BsContextMenuDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextMenuComponent {
  protected readonly chosen = signal<string | null>(null);

  protected readonly snippetBasicHtml = dedent`
    <div class="target-area" tabindex="0">
      Right-click me
      <ng-template bsContextMenu>
        <bs-dropdown-menu (itemselect)="chosen.set($event.value)">
          <bs-dropdown-item [value]="'cut'">Cut</bs-dropdown-item>
          <bs-dropdown-item [value]="'copy'">Copy</bs-dropdown-item>
          <bs-dropdown-item [value]="'paste'">Paste</bs-dropdown-item>
        </bs-dropdown-menu>
      </ng-template>
    </div>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { BsContextMenuDirective } from '@mintplayer/ng-bootstrap/context-menu';
    import { BsDropdownMenuComponent, BsDropdownItemComponent } from '@mintplayer/ng-bootstrap/dropdown';

    @Component({
      selector: 'my-context-menu-demo',
      templateUrl: './my-context-menu-demo.component.html',
      imports: [BsContextMenuDirective, BsDropdownMenuComponent, BsDropdownItemComponent],
    })
    export class MyContextMenuDemoComponent {
      protected readonly chosen = signal<unknown>(null);
    }
  `;
}
