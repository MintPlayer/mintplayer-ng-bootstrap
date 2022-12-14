import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsRangeComponent } from '@mintplayer/ng-bootstrap/range';
import { BsRangeMockComponent } from './component/range.component';
import { BsRangeMockValueAccessor } from './directives/range-value-accessor.directive';

@NgModule({
  declarations: [BsRangeMockComponent, BsRangeMockValueAccessor],
  imports: [CommonModule],
  exports: [BsRangeMockComponent, BsRangeMockValueAccessor],
  providers: [
    { provide: BsRangeComponent, useExisting: BsRangeMockComponent },
  ]
})
export class BsRangeTestingModule {}
