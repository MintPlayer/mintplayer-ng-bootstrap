import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsShellModule } from '@mintplayer/ng-bootstrap/shell';
import { BsSelectModule } from '@mintplayer/ng-bootstrap/select';

import { ShellRoutingModule } from './shell-routing.module';
import { ShellComponent } from './shell.component';


@NgModule({
  declarations: [
    ShellComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    BsFormModule,
    BsSelectModule,
    BsShellModule,
    ShellRoutingModule
  ]
})
export class ShellModule { }
