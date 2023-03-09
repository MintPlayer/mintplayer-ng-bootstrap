import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserAgentComponent } from './user-agent.component';

const routes: Routes = [{ path: '', component: UserAgentComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserAgentRoutingModule { }
