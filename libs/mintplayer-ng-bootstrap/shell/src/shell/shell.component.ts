import { Overlay } from '@angular/cdk/overlay';
import { Component, TemplateRef } from '@angular/core';

@Component({
  selector: 'bs-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class BsShellComponent {
  sidebarTemplate?: TemplateRef<any>;
}
