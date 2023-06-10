import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EVENT_MANAGER_PLUGINS } from '@angular/platform-browser';
import { BsBindEventPlugin } from './bind-event.plugin';

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [
    {
      provide: EVENT_MANAGER_PLUGINS,
      useClass: BsBindEventPlugin,
      multi: true,
    },
  ]
})
export class BsAsyncHostBindingModule { }
