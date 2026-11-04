import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCalendarComponent } from '@mintplayer/ng-bootstrap/calendar';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import {
  BsDropdownDirective,
  BsDropdownDividerComponent,
  BsDropdownHeaderComponent,
  BsDropdownItemComponent,
  BsDropdownMenuComponent,
} from '@mintplayer/ng-bootstrap/dropdown';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss'],
  imports: [
    BsCodeSnippetComponent,
    BsCalendarComponent,
    BsDropdownDirective,
    BsDropdownMenuComponent,
    BsDropdownItemComponent,
    BsDropdownHeaderComponent,
    BsDropdownDividerComponent,
    BsButtonTypeDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownComponent {
  protected readonly colors = Color;
  protected readonly chosen = signal<string | null>(null);

  protected readonly snippetBasicHtml = dedent`
    <button [color]="colors.primary">
      Actions
      <ng-container *bsDropdown>
        <bs-dropdown-menu (itemSelect)="chosen.set($event.value)">
          <bs-dropdown-header>File</bs-dropdown-header>
          <bs-dropdown-item [value]="'new'">New</bs-dropdown-item>
          <bs-dropdown-item [value]="'save'" [disabled]="true">Save</bs-dropdown-item>
          <bs-dropdown-divider></bs-dropdown-divider>
          <bs-dropdown-item><a href="https://getbootstrap.com">Bootstrap</a></bs-dropdown-item>
        </bs-dropdown-menu>
      </ng-container>
    </button>

    <button [color]="colors.primary">
      Pick a date
      <ng-container *bsDropdown="'bottom-start'; hasPopup: 'dialog'">
        <bs-calendar></bs-calendar>
      </ng-container>
    </button>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
    import {
      BsDropdownDirective,
      BsDropdownMenuComponent,
      BsDropdownItemComponent,
      BsDropdownHeaderComponent,
      BsDropdownDividerComponent,
    } from '@mintplayer/ng-bootstrap/dropdown';

    @Component({
      selector: 'my-dropdown-demo',
      templateUrl: './my-dropdown-demo.component.html',
      imports: [
        BsDropdownDirective,
        BsDropdownMenuComponent,
        BsDropdownItemComponent,
        BsDropdownHeaderComponent,
        BsDropdownDividerComponent,
        BsButtonTypeDirective,
      ],
    })
    export class MyDropdownDemoComponent {
      protected readonly colors = Color;
      protected readonly chosen = signal<unknown>(null);
    }
  `;
}
