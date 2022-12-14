import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsBreadcrumbMockComponent } from './breadcrumb/breadcrumb.component';
import { BsBreadcrumbItemMockComponent } from './breadcrumb-item/breadcrumb-item.component';
import { BsBreadcrumbComponent, BsBreadcrumbItemComponent } from '@mintplayer/ng-bootstrap/breadcrumb';

@NgModule({
  declarations: [BsBreadcrumbMockComponent, BsBreadcrumbItemMockComponent],
  imports: [CommonModule],
  exports: [BsBreadcrumbMockComponent, BsBreadcrumbItemMockComponent],
  providers: [
    { provide: BsBreadcrumbComponent, useClass: BsBreadcrumbMockComponent },
    { provide: BsBreadcrumbItemComponent, useClass: BsBreadcrumbItemMockComponent },
  ]
})
export class BsBreadcrumbTestingModule {}
