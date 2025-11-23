import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent } from '@mintplayer/ng-bootstrap/accordion';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsShellComponent, BsShellModule } from '@mintplayer/ng-bootstrap/shell';
import { BsToggleButtonComponent, BsToggleButtonGroupDirective } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-shell',
  imports: [FormsModule, BsShellModule, BsAccordionComponent, BsAccordionTabComponent, BsAccordionTabHeaderComponent, BsButtonGroupComponent, BsButtonTypeDirective, BsToggleButtonComponent, BsToggleButtonGroupDirective],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {
  colors = Color;
  shellState: 'auto' | 'show' | 'hide' = 'auto';
  @ViewChild('shell') shell!: BsShellComponent;

  setSize(rem: number) {
    this.shell.setSize(`${rem}rem`);
  }
}
