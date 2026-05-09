import { Component, computed, ElementRef, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { BsDropdownDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';

@Component({
  selector: 'bs-dropdown-item',
  templateUrl: './dropdown-item.component.html',
  styleUrls: ['./dropdown-item.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.role]': 'itemRole()',
    '[attr.aria-selected]': 'ariaSelected()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.id]': 'itemId',
  },
})
export class BsDropdownItemComponent {
  private parent = inject(BsDropdownDirective, { optional: true });
  private elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private ids = inject(BsIdService);

  readonly isSelected = input(false);
  readonly disabled = input(false);

  readonly itemRole = computed(() =>
    this.parent?.popupRole() === 'listbox' ? 'option' : 'menuitem');

  readonly ariaSelected = computed(() => {
    if (this.parent?.popupRole() !== 'listbox') return null;
    return this.isSelected() ? 'true' : 'false';
  });

  readonly itemId = this.elementRef.nativeElement.id
    || this.ids.next('bs-dropdown-item');
}
