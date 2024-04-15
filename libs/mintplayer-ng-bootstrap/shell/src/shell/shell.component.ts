import { Component, ElementRef, TemplateRef, ViewChild } from '@angular/core';

@Component({
  selector: 'bs-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class BsShellComponent {
  sidebarTemplate: TemplateRef<any> | null = null;
  @ViewChild('root') rootElement!: ElementRef<HTMLDivElement>;

  public setSize(size: string) {
    this.rootElement.nativeElement.style.setProperty('--size', size);
  }
}
