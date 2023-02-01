import { NgModule } from '@angular/core';
import { ServerModule } from '@angular/platform-server';
import { AppComponent, AppModule } from '@mintplayer/ng-bootstrap/demo';


@NgModule({
  imports: [
    AppModule,
    ServerModule,
  ],
  bootstrap: [AppComponent],
})
export class AppServerModule {}
