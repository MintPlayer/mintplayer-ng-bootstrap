import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  input,
} from '@angular/core';

@Component({
  selector: 'bs-ribbon-template-item',
  template: `
    <mp-ribbon-template-item [attr.size]="size()">
      <ng-content></ng-content>
    </mp-ribbon-template-item>
  `,
  styles: [`:host { display: inline-flex; }`],
  host: {
    '[attr.size]': 'size()',
    '[attr.data-size]': 'size()',
  },
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsRibbonTemplateItemComponent {
  readonly size = input<'large' | 'medium' | 'small'>('medium');
}
