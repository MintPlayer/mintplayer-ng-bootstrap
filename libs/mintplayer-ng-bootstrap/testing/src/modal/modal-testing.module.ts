import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsModalHostMockComponent } from './modal-host/modal-host.component';

@NgModule({
  declarations: [BsModalHostMockComponent],
  imports: [CommonModule],
  exports: [BsModalHostMockComponent],
})
export class BsModalTestingModule {}
