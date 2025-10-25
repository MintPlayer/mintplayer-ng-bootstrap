import { AfterContentInit, Component, Input, TemplateRef, ViewChild } from '@angular/core';

@Component({
  selector: 'bs-dock-pane',
  standalone: false,
  template: `<ng-template><ng-content></ng-content></ng-template>`,
})
export class BsDockPaneComponent implements AfterContentInit {
  @Input() name!: string;
  @Input() title?: string;

  @ViewChild(TemplateRef, { static: true }) template!: TemplateRef<unknown>;

  ngAfterContentInit(): void {
    if (!this.name) {
      throw new Error('bs-dock-pane requires a unique "name" input.');
    }
  }
}
