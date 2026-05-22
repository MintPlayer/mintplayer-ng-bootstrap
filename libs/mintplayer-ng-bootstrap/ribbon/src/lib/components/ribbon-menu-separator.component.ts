import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
@Component({
  selector: 'bs-ribbon-menu-separator',
  templateUrl: './ribbon-menu-separator.component.html',
  host: {
    '[attr.slot]': "'menu'",
  },
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonMenuSeparatorComponent {}
