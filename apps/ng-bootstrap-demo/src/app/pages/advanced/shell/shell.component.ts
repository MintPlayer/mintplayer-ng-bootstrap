import { Component } from '@angular/core';
import { BsShellState } from '@mintplayer/ng-bootstrap/shell';

@Component({
  selector: 'demo-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {
  sidebarState: BsShellState = 'auto';
  numbers = Array.from(Array(5).keys());
}
