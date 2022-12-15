import { Directive, Input, HostBinding } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';

@Directive({
  selector: 'button[color],input[type="button"][color],input[type="submit"][color]'
})
export class BsButtonTypeDirective {
  @HostBinding('class.btn') btnClass = true;
  @HostBinding('class') buttonClass = 'btn-transparent';
  @Input() public set color(value: Color) {
    const name = Color[value];
    this.buttonClass = `btn-${name}`;
  }
}
