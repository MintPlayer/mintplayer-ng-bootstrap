import { Directive } from '@angular/core';
import { BsTabPageComponent } from '../tab-page/tab-page.component';

@Directive({
  selector: '[tabPageHeader]'
})
export class TabPageHeaderDirective {

  constructor(private tabPage: BsTabPageComponent) {
    
  }

}
