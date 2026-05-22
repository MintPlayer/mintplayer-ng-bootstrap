import { AfterContentInit, Component, input, TemplateRef, viewChild, ChangeDetectionStrategy } from '@angular/core';
@Component({
  selector: 'bs-dock-pane',
  templateUrl: './dock-pane.component.html',
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
