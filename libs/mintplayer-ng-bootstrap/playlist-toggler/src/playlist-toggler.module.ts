import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsPlaylistTogglerComponent } from './playlist-toggler/playlist-toggler.component';

@NgModule({
  declarations: [BsPlaylistTogglerComponent],
  imports: [CommonModule],
  exports: [BsPlaylistTogglerComponent]
})
export class BsPlaylistTogglerModule { }
