import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAccordionModule } from '@mintplayer/ng-bootstrap/accordion';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsCheckRadioGroupDirective } from '@mintplayer/ng-bootstrap/form-check';
import { BsRadioButtonComponent } from '@mintplayer/ng-bootstrap/radio-button';
import { BsShellComponent, BsShellModule } from '@mintplayer/ng-bootstrap/shell';

@Component({
  selector: 'demo-shell',
  standalone: true,
  imports: [FormsModule, BsShellModule, BsAccordionModule, BsButtonGroupComponent, BsButtonTypeDirective, BsRadioButtonComponent, BsCheckRadioGroupDirective],
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
