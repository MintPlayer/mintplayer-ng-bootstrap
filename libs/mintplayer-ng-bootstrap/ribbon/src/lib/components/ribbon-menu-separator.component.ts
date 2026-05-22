import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
@Component({
  selector: 'bs-ribbon-menu-separator',
  template: `<mp-ribbon-menu-separator></mp-ribbon-menu-separator>`,
  host: {
    '[attr.slot]': "'menu'",
  },
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonMenuSeparatorComponent {}
