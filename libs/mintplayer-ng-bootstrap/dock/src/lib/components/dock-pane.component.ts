import { AfterContentInit, Component, input, TemplateRef, viewChild, ChangeDetectionStrategy} from '@angular/core';

@Component({
  selector: 'bs-dock-pane',
  template: `<ng-template><ng-content></ng-content></ng-template>`,
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsDockPaneComponent implements AfterContentInit {
  readonly name = input.required<string>();
  readonly title = input<string | undefined>(undefined);

  readonly template = viewChild.required(TemplateRef);

  ngAfterContentInit(): void {
    if (!this.name()) {
      throw new Error('bs-dock-pane requires a unique "name" input.');
    }
  }
}
