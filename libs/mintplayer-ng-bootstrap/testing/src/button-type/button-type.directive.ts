import { Directive, Input, HostBinding } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';

@Directive({
  selector: 'button[color],input[type="button"][color],input[type="submit"][color]',
  providers: [
    { provide: BsButtonTypeDirective, useExisting: BsButtonTypeMockDirective },
  ]
})
export class BsButtonTypeMockDirective {
  @Input() color: Color = Color.transparent;
}
