import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
} from '@angular/core';

@Component({
  selector: 'bs-ribbon-tab',
  template: `
    <mp-ribbon-tab [attr.tab-id]="tabId()" [attr.label]="label()">
      <ng-content></ng-content>
    </mp-ribbon-tab>
  `,
  styles: [`:host { display: contents; }`],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonTabComponent {
  readonly tabId = input<string>('');
  readonly label = input<string>('');
}
