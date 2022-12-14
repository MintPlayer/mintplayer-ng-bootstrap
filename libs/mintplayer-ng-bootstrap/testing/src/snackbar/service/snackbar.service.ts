import { Injectable, TemplateRef } from '@angular/core';
import { BsSnackbarComponent } from '@mintplayer/ng-bootstrap/snackbar';

@Injectable()
export class BsSnackbarMockService {

  public show(template: TemplateRef<any>) {
    return null;
  }

  public hide(snackbar: BsSnackbarComponent) {
  }

}
