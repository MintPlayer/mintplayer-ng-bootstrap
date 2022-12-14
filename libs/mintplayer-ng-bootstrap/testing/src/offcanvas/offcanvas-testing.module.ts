import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsOffcanvasHostMockComponent } from './offcanvas-host/offcanvas-host.component';
import { BsOffcanvasContentMockDirective } from './offcanvas-content/offcanvas-content.directive';

@NgModule({
  declarations: [BsOffcanvasHostMockComponent, BsOffcanvasContentMockDirective],
  imports: [CommonModule],
  exports: [BsOffcanvasHostMockComponent, BsOffcanvasContentMockDirective],
  providers: [
    { provide: BsOffcanvasHostMockComponent, useClass: BsOffcanvasHostMockComponent }
  ]
})
export class BsOffcanvasTestingModule {}
