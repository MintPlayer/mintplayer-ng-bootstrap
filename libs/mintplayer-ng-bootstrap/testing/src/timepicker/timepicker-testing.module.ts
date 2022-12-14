import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTimepickerMockComponent } from './component/timepicker.component';

@NgModule({
  declarations: [BsTimepickerMockComponent],
  imports: [CommonModule],
  exports: [BsTimepickerMockComponent],
})
export class BsTimepickerTestingModule {}
