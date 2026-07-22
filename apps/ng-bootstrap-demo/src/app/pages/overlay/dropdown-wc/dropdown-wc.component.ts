import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import {
  BsDropdownMenuComponent,
  BsDropdownItemDirective,
  BsDropdownDividerDirective,
  BsDropdownHeaderDirective,
} from '@mintplayer/ng-bootstrap/dropdown-menu';
import type { DropdownSelectEventDetail } from '@mintplayer/web-components/dropdown-menu';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-dropdown-wc',
  imports: [BsCodeSnippetComponent, BsDropdownMenuComponent, BsDropdownItemDirective, BsDropdownDividerDirective, BsDropdownHeaderDirective],
  templateUrl: './dropdown-wc.component.html',
  styleUrl: './dropdown-wc.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownWcComponent {
  protected readonly selectedValue = signal<string | null>(null);

  protected onSelect(detail: DropdownSelectEventDetail) {
    this.selectedValue.set(String(detail.value));
  }

  protected readonly snippetHtml = dedent`
    <bs-dropdown-menu (select)="onSelect($event)">
      <li bsDropdownHeader>Actions</li>
      <li bsDropdownItem [value]="'new'">New file</li>
      <li bsDropdownItem [value]="'open'" [active]="true">Open…</li>
      <li bsDropdownItem [value]="'save'" [disabled]="true">Save (disabled)</li>
      <li bsDropdownDivider></li>
      <li bsDropdownItem [value]="'exit'">Exit</li>
    </bs-dropdown-menu>
  `;

  protected readonly snippetTs = dedent`
    import { Component, signal } from '@angular/core';
    import {
      BsDropdownMenuComponent,
      BsDropdownItemDirective,
      BsDropdownDividerDirective,
      BsDropdownHeaderDirective,
    } from '@mintplayer/ng-bootstrap/dropdown-menu';
    import type { DropdownSelectEventDetail } from '@mintplayer/web-components/dropdown-menu';

    @Component({
      selector: 'my-dropdown-demo',
      templateUrl: './my-dropdown-demo.component.html',
      imports: [BsDropdownMenuComponent, BsDropdownItemDirective, BsDropdownDividerDirective, BsDropdownHeaderDirective],
    })
    export class MyDropdownDemoComponent {
      readonly selectedValue = signal<string | null>(null);

      onSelect(detail: DropdownSelectEventDetail) {
        this.selectedValue.set(String(detail.value));
      }
    }
  `;
}
