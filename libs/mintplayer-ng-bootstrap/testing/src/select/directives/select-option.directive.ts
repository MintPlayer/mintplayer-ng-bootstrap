import { Directive, Input } from "@angular/core";

@Directive({ selector: 'option' })
export class BsSelectOptionMock {
  @Input('ngValue') ngValue: any = null;
  @Input('value') value: any = null;

  setElementValue(value: string) {}
}