import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsCardMockComponent } from './card/card.component';
import { BsCardHeaderMockComponent } from './card-header/card-header.component';
import { BsCardComponent, BsCardHeaderComponent } from '@mintplayer/ng-bootstrap/card';

@NgModule({
  declarations: [BsCardMockComponent, BsCardHeaderMockComponent],
  imports: [CommonModule],
  exports: [BsCardMockComponent, BsCardHeaderMockComponent],
  providers: [
    { provide: BsCardComponent, useClass: BsCardMockComponent },
    { provide: BsCardHeaderComponent, useClass: BsCardHeaderMockComponent }
  ]
})
export class BsCardTestingModule {}
