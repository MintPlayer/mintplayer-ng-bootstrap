import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsButtonGroupModule } from '@mintplayer/ng-bootstrap/button-group';
import { BsButtonTypeModule } from '@mintplayer/ng-bootstrap/button-type';
import { BsQueryBuilderComponent } from './components/query-builder/query-builder.component';
import { BsQueryItemRendererComponent } from './components/query-item-renderer/query-item-renderer.component';

@NgModule({
  declarations: [BsQueryBuilderComponent, BsQueryItemRendererComponent],
  imports: [CommonModule, BsButtonGroupModule, BsButtonTypeModule],
  exports: [BsQueryBuilderComponent, BsQueryItemRendererComponent],
})
export class BsQueryBuilderModule {}
