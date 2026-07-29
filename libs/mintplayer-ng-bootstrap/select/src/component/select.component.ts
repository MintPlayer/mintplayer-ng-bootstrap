import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { BsSelectValueAccessor } from '../value-accessors/select-value-accessor';
import { BsSelectSize } from '../types/select-size';
import type { MpSelect } from '@mintplayer/web-components/select';

// Side-effect import: registers <mp-select>.
import '@mintplayer/web-components/select';
import { BsForwardAriaDirective, BsControlValidityDirective } from '@mintplayer/ng-bootstrap/a11y';

@Component({
  selector: 'bs-select',
  templateUrl: './select.component.html',
  imports: [BsForwardAriaDirective],
  styleUrls: ['./select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  hostDirectives: [{
    directive: forwardRef(() => BsSelectValueAccessor),
    inputs: ['compareWith'],
  }, BsControlValidityDirective],
})
export class BsSelectComponent {
  constructor() {
    effect(() => {
      const el = this.selectBox()?.nativeElement;
      if (!el) return;
      el.size = this.size();
      el.multiple = this.multiple();
      el.numberVisible = this.numberVisible();
      el.disabled = this.disabled();
    });
  }

  // For debugging purposes
  identifier = input(0);

  /** Reference to the underlying `<mp-select>` WC. Read by
   *  `BsSelectValueAccessor` to drive `value` / `disabled` via property
   *  setters and listen for the bubbled, composed `change` event. */
  readonly selectBox = viewChild.required<ElementRef<MpSelect>>('selectBox');

  size = input<BsSelectSize>('md');
  multiple = input<boolean>(false);
  numberVisible = input<number | null>(null);
  disabled = input<boolean>(false);
}
