import { Optional, Component, ContentChild, ElementRef } from '@angular/core';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';

@Component({
  selector: 'bs-floating-label',
  templateUrl: './floating-label.component.html',
  styleUrls: ['./floating-label.component.scss'],
  standalone: true
})
export class BsFloatingLabelComponent {
  constructor(@Optional() bsForm: BsFormComponent) {
    if (!bsForm) {
      throw '<bs-floating-label> must be inside a <bs-form>';
    }
  }

  // @ContentChild(BsFloatingFormControlDirective, { read: ElementRef }) input!: ElementRef<HTMLInputElement>;

  // ngAfterContentInit() {
  //   this.input.nativeElement.classList.add('form-control');
  // }
}
