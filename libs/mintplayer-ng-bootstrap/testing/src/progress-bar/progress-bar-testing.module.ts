import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsProgressMockComponent } from './progress/progress.component';
import { BsProgressBarMockComponent } from './progress-bar/progress-bar.component';

@NgModule({
  declarations: [BsProgressMockComponent, BsProgressBarMockComponent],
  imports: [CommonModule],
  exports: [BsProgressMockComponent, BsProgressBarMockComponent],
})
export class BsProgressBarTestingModule {}
