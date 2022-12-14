import { Directive, Input } from '@angular/core';
import { BsNavbarComponent } from '@mintplayer/ng-bootstrap/navbar';

@Directive({
  selector: '[navbarContent]'
})
export class NavbarContentMockDirective {
  @Input('navbarContent') navbar!: BsNavbarComponent;
}
