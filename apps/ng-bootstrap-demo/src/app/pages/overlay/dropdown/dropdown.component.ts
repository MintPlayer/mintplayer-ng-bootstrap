import { Component, ChangeDetectionStrategy } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCalendarComponent } from '@mintplayer/ng-bootstrap/calendar';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss'],
  imports: [BsCodeSnippetComponent, BsCalendarComponent, BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective, BsHasOverlayComponent, BsButtonTypeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DropdownComponent {
  colors = Color;

  protected readonly snippetBasicHtml = dedent`
    <div bsDropdown [closeOnClickOutside]="true">
      <button bsDropdownToggle [color]="colors.primary">Dropdown</button>
      <div *bsDropdownMenu>
        Place any content here — menu items, a calendar, a form.
      </div>
    </div>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
    import { BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective } from '@mintplayer/ng-bootstrap/dropdown';
    @Component({
      selector: 'my-dropdown-demo',
      templateUrl: './my-dropdown-demo.component.html',
      imports: [
        BsDropdownDirective,
        BsDropdownToggleDirective,
        BsDropdownMenuDirective,
        BsButtonTypeDirective,
      ],
    })
    export class MyDropdownDemoComponent {
      protected readonly colors = Color;
    }
  `;
}
