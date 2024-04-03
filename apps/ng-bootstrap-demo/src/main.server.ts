import { bootstrapApplication } from "@angular/platform-browser";
import { renderApplication } from "@angular/platform-server";
import { AppComponent } from "./app/app.component";
import { config } from './app/app.config';

renderApplication(() => bootstrapApplication(AppComponent, config), {});
