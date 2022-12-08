import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsBreadcrumbComponent } from './breadcrumb/breadcrumb.component';
import { BsBreadcrumbItemComponent } from './breadcrumb-item/breadcrumb-item.component';

@NgModule({
  declarations: [BsBreadcrumbComponent, BsBreadcrumbItemComponent],
  imports: [CommonModule],
  exports: [BsBreadcrumbComponent, BsBreadcrumbItemComponent],
})
export class BsBreadcrumbModule {}
