import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsContainerComponent } from './container/container.component';

@NgModule({
  declarations: [BsContainerComponent],
  imports: [CommonModule],
  exports: [BsContainerComponent],
})
export class BsContainerModule {}
