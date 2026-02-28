import { Component, viewChild, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent } from '@mintplayer/ng-bootstrap/accordion';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsShellComponent, BsShellSidebarDirective } from '@mintplayer/ng-bootstrap/shell';
import { BsToggleButtonComponent, BsToggleButtonValueAccessor, BsToggleButtonGroupDirective } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-shell',
  imports: [FormsModule, BsShellComponent, BsShellSidebarDirective, BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent, BsButtonGroupComponent, BsButtonTypeDirective, BsToggleButtonComponent, BsToggleButtonValueAccessor, BsToggleButtonGroupDirective],
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
}
