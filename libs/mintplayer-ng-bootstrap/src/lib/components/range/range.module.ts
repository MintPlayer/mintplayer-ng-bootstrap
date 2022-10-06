import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsRangeComponent } from './component/range.component';
import { BsRangeValueAccessor } from './value-accessor/range-value-accessor';

@NgModule({
  declarations: [BsRangeComponent, BsRangeValueAccessor],
  imports: [CommonModule],
  exports: [BsRangeComponent, BsRangeValueAccessor],
})
export class BsRangeModule {}
