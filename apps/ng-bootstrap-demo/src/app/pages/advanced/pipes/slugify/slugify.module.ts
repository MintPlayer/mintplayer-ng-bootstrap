import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsSlugifyModule } from '@mintplayer/ng-bootstrap/slugify';

import { SlugifyRoutingModule } from './slugify-routing.module';
import { SlugifyComponent } from './slugify.component';


@NgModule({
  declarations: [
    SlugifyComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsFormModule,
    BsSlugifyModule,
    SlugifyRoutingModule
  ]
})
export class SlugifyModule { }
