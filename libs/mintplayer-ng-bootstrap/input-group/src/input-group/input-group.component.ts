import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, computed, input } from '@angular/core';
import { BsForwardAriaDirective } from '@mintplayer/ng-bootstrap/a11y';

// Side-effect import: registers <mp-input-group>.
import '@mintplayer/web-components/input-group';

export type BsInputGroupSize = 'sm' | 'md' | 'lg';

/**
 * `<bs-input-group>` — joins its children into one visually continuous control.
 *
 * Now a wrapper over `<mp-input-group>`. The previous version was a
 * `<div class="input-group">` plus a `::ng-deep` import of Bootstrap's module,
 * which could not style a `<bs-select>`: the rules Bootstrap keys on
 * `.input-group > .form-select` cannot reach inside that component's shadow root,
 * so a select in a group got neither the flex sizing nor collapsed inner corners.
 * The WC solves it with two channels (see `input-group.styles.scss`), which is why
 * the styling moved there rather than being duplicated here.
 */
@Component({
  selector: 'bs-input-group',
  templateUrl: './input-group.component.html',
  imports: [BsForwardAriaDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class BsInputGroupComponent {
  /** Bootstrap sizing, applied to light-DOM and `mp-*` children alike. */
  readonly size = input<BsInputGroupSize>('md');

  /** `md` is the absence of a size in Bootstrap, so it is not written at all. */
  protected readonly sizeAttr = computed(() => (this.size() === 'md' ? null : this.size()));
}
