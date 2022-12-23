import { AfterContentInit, Component, ContentChild, ElementRef } from '@angular/core';
import { BsFloatingFormControlDirective } from '../floating-form-control/floating-form-control.directive';

@Component({
  selector: 'bs-floating-label',
  templateUrl: './floating-label.component.html',
  styleUrls: ['./floating-label.component.scss'],
})
export class BsFloatingLabelComponent implements AfterContentInit {
  @ContentChild(BsFloatingFormControlDirective, { read: ElementRef }) input!: ElementRef<HTMLInputElement>;

  ngAfterContentInit() {
    this.input.nativeElement.classList.add('form-control');
  }
}
