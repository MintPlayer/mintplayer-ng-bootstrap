import { Directive, Input, TemplateRef } from '@angular/core';
import { BsSelect2Component } from '../../component/select2.component';
import { HasId } from '@mintplayer/ng-bootstrap/has-id';

@Directive({
  selector: '[bsItemTemplate]',
  standalone: false,
})
export class BsItemTemplateDirective<T extends HasId<U>, U> {
  constructor(private select2component: BsSelect2Component<T, U>, templateRef: TemplateRef<T>) {
    this.select2component.itemTemplate = templateRef;
  }

  public static ngTemplateContextGuard<T extends HasId<U>, U>(dir: BsItemTemplateDirective<T, U>, ctx: any): ctx is BsItemTemplateContext<Exclude<T, false | 0 | '' | null | undefined>, U> {
    return true;
  }

  @Input() set bsItemTemplateOf(value: T[]) {
    this.select2component.selectedItems.set(value);
  }
}

export class BsItemTemplateContext<T extends HasId<U>, U> {
  $implicit: T = null!;
  select2: BsSelect2Component<T, U> = null!;
}