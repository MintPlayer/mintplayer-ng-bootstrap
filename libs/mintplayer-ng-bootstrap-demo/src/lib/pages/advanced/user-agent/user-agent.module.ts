import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsUserAgentModule } from '@mintplayer/ng-bootstrap/user-agent';

import { UserAgentRoutingModule } from './user-agent-routing.module';
import { UserAgentComponent } from './user-agent.component';


@NgModule({
  declarations: [
    UserAgentComponent
  ],
  imports: [
    CommonModule,
    BsAlertModule,
    BsUserAgentModule,
    UserAgentRoutingModule
  ]
})
export class UserAgentModule { }
