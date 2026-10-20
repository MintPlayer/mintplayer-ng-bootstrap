import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { capColorClasses } from '@mintplayer/ui-core/card';

/**
 * Card header. A nav inside it takes Bootstrap's own `card-header-tabs` or
 * `card-header-pills` class, written by the consumer on the nav (the old
 * `navStyle` input walked and mutated consumer DOM, which a headless front
 * never does).
 */
@Component({
  selector: 'bs-card-header',
  template: '<ng-content></ng-content>',
  host: { '[class]': 'classes()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsCardHeaderComponent {
  readonly color = input<Color | undefined>(undefined);

  protected readonly classes = computed(() => {
    const c = this.color();
    return ['card-header', ...capColorClasses(c === undefined ? null : Color[c])];
  });
}
