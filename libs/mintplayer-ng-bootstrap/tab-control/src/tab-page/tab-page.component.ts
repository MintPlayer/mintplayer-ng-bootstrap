import { ChangeDetectionStrategy, Component, contentChild, input, TemplateRef, viewChild } from '@angular/core';
import { BsTabPageHeaderDirective } from '../tab-page-header/tab-page-header.directive';

/**
 * One page of a `<bs-tab-control>`. Renders nothing itself: the control
 * renders every radio, tab and pane as siblings (the CSS pairs the n-th radio
 * with the n-th pane), so the page hands over its header and body templates.
 */
@Component({
  selector: 'bs-tab-page',
  template: '<ng-template #body><ng-content /></ng-template>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { hidden: '' },
})
export class BsTabPageComponent {
  readonly disabled = input(false);
  readonly headerTemplate = contentChild(BsTabPageHeaderDirective);
  readonly body = viewChild<TemplateRef<unknown>>('body');
}
