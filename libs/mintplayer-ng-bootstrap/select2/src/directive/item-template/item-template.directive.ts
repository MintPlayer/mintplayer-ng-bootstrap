import { Directive, effect, Input, isSignal, TemplateRef, untracked, WritableSignal } from '@angular/core';
import { BsSelect2Component } from '../../component/select2.component';
import { HasId } from '@mintplayer/ng-bootstrap/has-id';

@Directive({
  selector: '[bsItemTemplate]',
  standalone: false,
})
export class BsItemTemplateDirective<T extends HasId<U>, U> {
  private sourceSignal?: WritableSignal<T[]>;
  private lastSourceValue?: T[];

  constructor(private select2component: BsSelect2Component<T, U>, templateRef: TemplateRef<T>) {
    this.select2component.itemTemplate = templateRef;

    // Sync changes from component back to source signal
    effect(() => {
      const componentValue = this.select2component.selectedItems();
      if (this.sourceSignal) {
        const sourceValue = untracked(() => this.sourceSignal!());
        if (componentValue !== sourceValue) {
          this.sourceSignal.set(componentValue);
        }
      }
    });

    // Sync changes from source signal to component
    effect(() => {
      if (this.sourceSignal) {
        const sourceValue = this.sourceSignal();
        if (sourceValue !== this.lastSourceValue) {
          this.lastSourceValue = sourceValue;
          const componentValue = untracked(() => this.select2component.selectedItems());
          if (sourceValue !== componentValue) {
            this.select2component.selectedItems.set(sourceValue);
          }
        }
      }
    });
  }

  public static ngTemplateContextGuard<T extends HasId<U>, U>(dir: BsItemTemplateDirective<T, U>, ctx: any): ctx is BsItemTemplateContext<Exclude<T, false | 0 | '' | null | undefined>, U> {
    return true;
  }

  @Input() set bsItemTemplateOf(value: T[] | WritableSignal<T[]>) {
    if (isSignal(value)) {
      // Store the signal reference for two-way binding
      this.sourceSignal = value as WritableSignal<T[]>;
      this.lastSourceValue = value();
      this.select2component.selectedItems.set(value());
    } else {
      // Plain array - one-way binding (backward compatible)
      this.sourceSignal = undefined;
      this.select2component.selectedItems.set(value as T[]);
    }
  }
}

export class BsItemTemplateContext<T extends HasId<U>, U> {
  $implicit: T = null!;
  select2: BsSelect2Component<T, U> = null!;
}