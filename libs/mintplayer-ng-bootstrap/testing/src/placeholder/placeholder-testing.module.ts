import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsPlaceholderMockComponent } from './placeholder/placeholder.component';
import { BsPlaceholderComponent } from '@mintplayer/ng-bootstrap/placeholder';

@NgModule({
  declarations: [BsPlaceholderMockComponent],
  imports: [CommonModule],
  exports: [BsPlaceholderMockComponent],
  providers: [
    { provide: BsPlaceholderComponent, useClass: BsPlaceholderMockComponent },
  ]
})
export class BsPlaceholderTestingModule {}
