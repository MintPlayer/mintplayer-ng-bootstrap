import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsBadgeComponent } from '@mintplayer/ng-bootstrap/badge';
import { BsBadgeMockComponent } from './badge/badge.component';

@NgModule({
  declarations: [BsBadgeMockComponent],
  imports: [CommonModule],
  exports: [BsBadgeMockComponent],
  providers: [
    { provide: BsBadgeComponent, useClass: BsBadgeMockComponent }
  ]
})
export class BsBadgeTestingModule {}
