import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSpinnerMockComponent } from './component/spinner.component';

@NgModule({
  declarations: [BsSpinnerMockComponent],
  imports: [CommonModule],
  exports: [BsSpinnerMockComponent],
})
export class BsSpinnerTestingModule {}
