import { Component, ViewChild } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsShellComponent, BsShellModule } from '@mintplayer/ng-bootstrap/shell';

@Component({
  selector: 'demo-shell',
  standalone: true,
  imports: [BsShellModule, BsButtonTypeDirective],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {
  colors = Color;
  @ViewChild('shell') shell!: BsShellComponent;

  setSize(rem: number) {
    this.shell.setSize(`${rem}rem`);
  }
}
