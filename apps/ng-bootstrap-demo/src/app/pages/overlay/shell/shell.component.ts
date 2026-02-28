import { Component, viewChild, ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAccordionModule } from '@mintplayer/ng-bootstrap/accordion';
import { BsButtonGroupComponent } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsShellComponent, BsShellModule } from '@mintplayer/ng-bootstrap/shell';
import { BsToggleButtonModule } from '@mintplayer/ng-bootstrap/toggle-button';

@Component({
  selector: 'demo-shell',
  standalone: true,
  imports: [FormsModule, BsShellModule, BsAccordionModule, BsButtonGroupComponent, BsButtonTypeDirective, BsToggleButtonModule],
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
