import { ChangeDetectionStrategy, Component } from '@angular/core';
/**
 * Card body — explicit wrapper. No auto-padding workaround like the previous
 * implementation: Bootstrap's `.card-body` padding applies as upstream
 * specifies. Consumers wanting unpadded content can use a raw `<div>` inside
 * `<bs-card>` instead.
 */
@Component({
  selector: 'bs-card-body',
  template: '<ng-content></ng-content>',
  host: { class: 'card-body' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardBodyComponent {}
