import { Component, Inject, TemplateRef } from '@angular/core';
import { BsSnackbarComponent, BsSnackbarService } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-snackbar',
  templateUrl: './snackbar.component.html',
  styleUrls: ['./snackbar.component.scss']
})
export class SnackbarComponent {
  constructor(private snackbarService: BsSnackbarService, @Inject('GIT_REPO') gitRepo: string) {
    this.gitRepo = gitRepo;
  }

  gitRepo: string;
  snackbar: BsSnackbarComponent | null = null;
  showSnackbar(template: TemplateRef<any>) {
     this.snackbar = this.snackbarService.show(template);
  }
  hideSnackbar() {
    if (this.snackbar) {
      this.snackbarService.hide(this.snackbar);
    }
  }
}
