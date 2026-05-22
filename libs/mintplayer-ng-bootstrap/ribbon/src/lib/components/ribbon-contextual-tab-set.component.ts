import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';
@Component({
  selector: 'bs-ribbon-contextual-tab-set',
  templateUrl: './ribbon-contextual-tab-set.component.html',
  styles: [`:host { display: contents; }`],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonContextualTabSetComponent {
  readonly label = input<string>('');
  readonly color = input<string>('#F0AF84');
  readonly hidden = input<boolean>(false);
}
