import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsModalComponent } from './component/modal/modal.component';
import { BsModalDirective } from './directive/modal.directive';
import { BsModalHeaderComponent } from './component/modal-header/modal-header.component';
import { BsModalFooterComponent } from './component/modal-footer/modal-footer.component';
import { BsModalPresenterComponent } from './component/modal-presenter/modal-presenter.component';

@NgModule({
  declarations: [
    BsModalComponent,
    BsModalDirective,
    BsModalHeaderComponent,
    BsModalFooterComponent,
    BsModalPresenterComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsModalComponent,
    BsModalDirective,
    BsModalHeaderComponent,
    BsModalFooterComponent,
    BsModalPresenterComponent
  ]
})
export class BsModalModule { }
