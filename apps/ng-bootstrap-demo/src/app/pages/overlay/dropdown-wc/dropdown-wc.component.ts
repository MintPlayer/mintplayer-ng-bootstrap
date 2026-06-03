import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import {
  BsDropdownMenuWc,
  BsDropdownItemWc,
  BsDropdownDividerWc,
  BsDropdownHeaderWc,
} from '@mintplayer/ng-bootstrap/dropdown-menu-wc';
import type { DropdownSelectEventDetail } from '@mintplayer/web-components/dropdown-menu';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-dropdown-wc',
  imports: [BsCodeSnippetComponent, BsDropdownMenuWc, BsDropdownItemWc, BsDropdownDividerWc, BsDropdownHeaderWc],
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
    <bs-dropdown-wc-menu (select)="onSelect($event)">
      <bs-dropdown-wc-header>Actions</bs-dropdown-wc-header>
      <bs-dropdown-wc-item [value]="'new'">New file</bs-dropdown-wc-item>
      <bs-dropdown-wc-item [value]="'open'" [selected]="true">Open…</bs-dropdown-wc-item>
      <bs-dropdown-wc-item [value]="'save'" [disabled]="true">Save (disabled)</bs-dropdown-wc-item>
      <bs-dropdown-wc-divider></bs-dropdown-wc-divider>
      <bs-dropdown-wc-item [value]="'exit'">Exit</bs-dropdown-wc-item>
    </bs-dropdown-wc-menu>
  `;

  protected readonly snippetTs = dedent`
    import { Component, signal } from '@angular/core';
    import {
      BsDropdownMenuWc,
      BsDropdownItemWc,
      BsDropdownDividerWc,
      BsDropdownHeaderWc,
    } from '@mintplayer/ng-bootstrap/dropdown-menu-wc';
    import type { DropdownSelectEventDetail } from '@mintplayer/web-components/dropdown-menu';

    @Component({
      selector: 'my-dropdown-demo',
      templateUrl: './my-dropdown-demo.component.html',
      imports: [BsDropdownMenuWc, BsDropdownItemWc, BsDropdownDividerWc, BsDropdownHeaderWc],
    })
    export class MyDropdownDemoComponent {
      readonly selectedValue = signal<string | null>(null);

      onSelect(detail: DropdownSelectEventDetail) {
        this.selectedValue.set(String(detail.value));
      }
    }
  `;
}
