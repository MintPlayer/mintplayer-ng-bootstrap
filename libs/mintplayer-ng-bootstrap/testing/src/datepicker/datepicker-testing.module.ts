import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsDatepickerMockComponent } from './datepicker/datepicker.component';
import { BsDatepickerComponent } from '@mintplayer/ng-bootstrap/datepicker';

@NgModule({
  declarations: [BsDatepickerMockComponent],
  imports: [CommonModule],
  exports: [BsDatepickerMockComponent],
  providers: [
    { provide: BsDatepickerComponent, useClass: BsDatepickerMockComponent }
  ]
})
export class BsDatepickerTestingModule {}
