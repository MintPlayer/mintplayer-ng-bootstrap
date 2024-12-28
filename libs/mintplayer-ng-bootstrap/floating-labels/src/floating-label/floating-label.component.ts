import { Optional, Component, ContentChild, ElementRef, ViewEncapsulation } from '@angular/core';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';

@Component({
  selector: 'bs-floating-label',
  standalone: true,
  templateUrl: './floating-label.component.html',
  styleUrls: ['./floating-label.component.scss'],
  encapsulation: ViewEncapsulation.None,
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
