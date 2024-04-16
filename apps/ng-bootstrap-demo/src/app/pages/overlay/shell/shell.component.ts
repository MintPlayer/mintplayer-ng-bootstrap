import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsShellComponent, BsShellModule } from '@mintplayer/ng-bootstrap/shell';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-shell',
  standalone: true,
  imports: [FormsModule, BsShellModule, BsButtonGroupComponent, BsButtonTypeDirective, BsToggleButtonModule],
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
