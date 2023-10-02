import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsNavbarTogglerModule } from '@mintplayer/ng-bootstrap/navbar-toggler';
import { BsPlaylistTogglerModule } from '@mintplayer/ng-bootstrap/playlist-toggler';

import { ToggleButtonsRoutingModule } from './toggle-buttons-routing.module';
import { ToggleButtonsComponent } from './toggle-buttons.component';


@NgModule({
  declarations: [
    ToggleButtonsComponent
  ],
  imports: [
    CommonModule,
    BsNavbarTogglerModule,
    BsPlaylistTogglerModule,
    ToggleButtonsRoutingModule
  ]
})
export class ToggleButtonsModule { }
