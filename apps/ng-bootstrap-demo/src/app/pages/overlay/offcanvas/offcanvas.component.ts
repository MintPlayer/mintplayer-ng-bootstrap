import { Component, Inject, TemplateRef } from '@angular/core';
import { BsOffcanvasComponent, BsOffcanvasService, OffcanvasPosition } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-offcanvas',
  templateUrl: './offcanvas.component.html',
  styleUrls: ['./offcanvas.component.scss']
})
export class OffcanvasComponent {

  constructor(private offcanvasService: BsOffcanvasService, @Inject('GIT_REPO') gitRepo: string) {
    this.gitRepo = gitRepo;
  }
  
  level1Menu: string | null = null;
  level2Menu: string | null = null;
  level3Menu: string | null = null;
  
  gitRepo: string;
  offcanvas: BsOffcanvasComponent | null = null;
  showOffcanvas(template: TemplateRef<any>, position: OffcanvasPosition) {
    this.offcanvas = this.offcanvasService.show(template, position, ['start', 'end'].includes(position), (offcanvas) => this.offcanvasService.hide(offcanvas));
  }
  showSidebar(template: TemplateRef<any>) {
    this.offcanvas = this.offcanvasService.show(template, 'start', true, (offcanvas) => this.offcanvasService.hide(offcanvas));
  }
  hideOffcanvas() {
    if (this.offcanvas) {
      this.offcanvasService.hide(this.offcanvas);
    }
  }

}
