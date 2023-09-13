import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsTrustHtmlPipe } from './trust-html.pipe';

@NgModule({
  declarations: [BsTrustHtmlPipe],
  imports: [CommonModule],
  exports: [BsTrustHtmlPipe],
})
export class BsTrustHtmlModule {}
