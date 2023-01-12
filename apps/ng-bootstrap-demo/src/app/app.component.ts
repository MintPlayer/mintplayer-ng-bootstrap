import { Component, Inject } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-bootstrap-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [SlideUpDownAnimation]
})
export class AppComponent {
  constructor(@Inject('BOOTSTRAP_VERSION') bootstrapVersion: string) {
    this.versionInfo = bootstrapVersion;
  }

  versionInfo = '';
  colors = Color;

  fun2: (() => boolean) | Promise<boolean> = new Promise<boolean>((resolve, reject) => {
    resolve(true);
  });
  
  fun: () => boolean | Promise<boolean> = () => {
    return true;
  };
  
  async test() {
    let result: boolean;
    if (typeof this.fun2 === 'function') {
      result = this.fun2();
    } else {
      result = await this.fun2;
    }
    console.log('result', result);
  }
}
