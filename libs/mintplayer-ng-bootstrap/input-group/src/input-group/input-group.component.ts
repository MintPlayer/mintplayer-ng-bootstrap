import { ChangeDetectionStrategy, Component, HostAttributeToken, computed, inject, input } from '@angular/core';
import { useBootstrap, useScopedStyles } from '@mintplayer/ng-bootstrap/machine';
import {
  INPUT_GROUP_SCOPE,
  inputGroupClasses,
  inputGroupRole,
  inputGroupScopedStyles,
  type InputGroupSize,
} from '@mintplayer/ui-core/input-group';
import { bootstrapForms } from '@mintplayer/ui-core/bootstrap';

export type BsInputGroupSize = InputGroupSize;

/**
 * `<bs-input-group>` — joins its children into one visually continuous control.
 *
 * The host IS Bootstrap's `.input-group` (PRD #437 wave A): its children are
 * its direct children, so the baseline's `.input-group > .form-control` rules
 * apply as written and a consumer's `aria-*` / `id` already sits on the
 * element that carries the role. The scoped sheet adds RTL and the sizing of
 * controls rendered inside a framework host (`<bs-select>`).
 *
 * The role is `group` only when the group is named. The name is read from the
 * host's static attributes, so SSR emits the same role; a group named through
 * a binding passes `role="group"` itself.
 */
@Component({
  selector: 'bs-input-group',
  template: '<ng-content></ng-content>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.data-mps]': 'scope',
    '[attr.role]': 'role',
  },
})
export class BsInputGroupComponent {
  /** Bootstrap sizing; `md` adds no class. */
  readonly size = input<BsInputGroupSize>('md');

  protected readonly scope = INPUT_GROUP_SCOPE;
  protected readonly classes = computed(() => inputGroupClasses(this.size()).join(' '));
  protected readonly role =
    inject(new HostAttributeToken('role'), { optional: true }) ??
    inputGroupRole(
      inject(new HostAttributeToken('aria-label'), { optional: true }) !== null ||
        inject(new HostAttributeToken('aria-labelledby'), { optional: true }) !== null,
    );

  constructor() {
    useBootstrap(bootstrapForms);
    useScopedStyles(INPUT_GROUP_SCOPE, inputGroupScopedStyles);
  }
}
