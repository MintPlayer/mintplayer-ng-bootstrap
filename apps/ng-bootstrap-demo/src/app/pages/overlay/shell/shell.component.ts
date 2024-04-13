import { Component } from '@angular/core';
import { BsShellModule } from '@mintplayer/ng-bootstrap/shell';

@Component({
  selector: 'demo-shell',
  standalone: true,
  imports: [BsShellModule],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class ShellComponent {

}
