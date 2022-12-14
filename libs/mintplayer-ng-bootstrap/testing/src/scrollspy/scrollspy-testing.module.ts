import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsScrollspyMockDirective } from './directive/scrollspy.directive';
import { BsScrollspyMockComponent } from './component/scrollspy.component';
import { BsScrollspyComponent, BsScrollspyDirective } from '@mintplayer/ng-bootstrap/scrollspy';

@NgModule({
  declarations: [BsScrollspyMockDirective, BsScrollspyMockComponent],
  imports: [CommonModule],
  exports: [BsScrollspyMockDirective, BsScrollspyMockComponent],
  providers: [
    { provide: BsScrollspyDirective, useClass: BsScrollspyMockDirective },
    { provide: BsScrollspyComponent, useClass: BsScrollspyMockComponent },
  ]
})
export class BsScrollspyTestingModule {}
