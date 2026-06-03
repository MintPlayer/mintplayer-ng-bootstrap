import { bootstrapApplication, BootstrapContext } from "@angular/platform-browser";
import { AppComponent } from "./app/app.component";
import { serverAppConfig } from './app/app.config.server';

const bootstrap = (context: BootstrapContext) => bootstrapApplication(AppComponent, serverAppConfig, context);

export default bootstrap;
