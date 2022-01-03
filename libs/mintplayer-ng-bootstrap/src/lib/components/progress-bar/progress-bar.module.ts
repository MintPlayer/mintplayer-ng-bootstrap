import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsProgressComponent } from './progress/progress.component';
import { BsProgressBarComponent } from './progress-bar/progress-bar.component';



@NgModule({
  declarations: [
    BsProgressBarComponent,
    BsProgressComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BsProgressBarComponent,
    BsProgressComponent
  ]
})
export class BsProgressBarModule { }
