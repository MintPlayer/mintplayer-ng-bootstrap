import { Component, viewChild, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent } from '@mintplayer/ng-bootstrap/accordion';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsShellComponent, BsShellSidebarDirective } from '@mintplayer/ng-bootstrap/shell';
import type { ShellStateChangeEventDetail } from '@mintplayer/web-components/shell';
import { BsRadioComponent, BsRadioGroupDirective } from '@mintplayer/ng-bootstrap/radio';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-shell',
  imports: [BsCodeSnippetComponent, FormsModule, BsShellComponent, BsShellSidebarDirective, BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent, BsButtonGroupComponent, BsButtonTypeDirective, BsRadioComponent, BsRadioGroupDirective],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  colors = Color;
  shellState: 'auto' | 'show' | 'hide' = 'auto';
  readonly shell = viewChild.required<BsShellComponent>('shell');

  setSize(rem: number) {
    this.shell().setSize(`${rem}rem`);
  }

  // Reflect an in-shell toggle (the hamburger) back onto the auto/show/hide
  // radios so they light up to match the sidebar's open/closed state.
  onShellToggle(detail: ShellStateChangeEventDetail) {
    this.shellState = detail.open ? 'show' : 'hide';
  }

  protected readonly snippetBasicHtml = dedent`
    <bs-shell [state]="'auto'" [breakpoint]="'md'">
      <nav bsShellSidebar>
        <span class="d-block p-3">Home</span>
        <span class="d-block p-3">Settings</span>
      </nav>

      <main class="p-3">
        Main content is any non-[bsShellSidebar] child.
      </main>
    </bs-shell>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { BsShellComponent, BsShellSidebarDirective } from '@mintplayer/ng-bootstrap/shell';

    @Component({
      selector: 'my-shell-demo',
      templateUrl: './my-shell-demo.component.html',
      imports: [BsShellComponent, BsShellSidebarDirective],
    })
    export class MyShellDemoComponent {}
  `;
}
