import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsSchedulerMockComponent } from './scheduler/scheduler.component';

@NgModule({
  declarations: [BsSchedulerMockComponent],
  imports: [CommonModule],
  exports: [BsSchedulerMockComponent],
})
export class BsSchedulerTestingModule {}
