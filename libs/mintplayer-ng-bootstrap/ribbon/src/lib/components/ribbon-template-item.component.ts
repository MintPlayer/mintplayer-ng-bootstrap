import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, input } from '@angular/core';
@Component({
  selector: 'bs-ribbon-template-item',
  templateUrl: './ribbon-template-item.component.html',
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
