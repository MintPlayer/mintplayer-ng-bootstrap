import { computed, Directive, inject } from '@angular/core';
import { useBootstrap } from '@mintplayer/ng-bootstrap/machine';
import { bootstrapPlaceholders } from '@mintplayer/ui-core/bootstrap/placeholders';
import { BsPlaceholderComponent } from '../placeholder/placeholder.component';

@Directive({
  selector: '[bsPlaceholderField]',
  host: {
    '[attr.data-mps]': '"placeholder"',
    '[attr.innerHtml]': 'html()',
    '[style.min-width.px]': '80',
    '[style.margin-bottom.px]': 'marginBottom()',
    '[class.placeholder]': 'isLoading()',
  },
})
export class BsPlaceholderFieldDirective {
  private placeholder = inject(BsPlaceholderComponent);

  constructor() {
    // #452: the placeholders partial ships with this component, scoped to the elements it stamps (data-mps="placeholder").
    useBootstrap(bootstrapPlaceholders);
  }

  // Derived, not copied from an effect into plain fields: a host binding re-renders
  // only when a signal it reads changes (zoneless).
  protected readonly isLoading = computed(() => this.placeholder.isLoading());
  protected readonly marginBottom = computed(() => (this.isLoading() ? -1 : 0));
  protected readonly html = computed(() => (this.isLoading() ? '&nbsp;' : undefined));
}
