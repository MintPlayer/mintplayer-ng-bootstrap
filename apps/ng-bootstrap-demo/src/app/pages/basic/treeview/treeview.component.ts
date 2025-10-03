/// <reference types="../../../../types" />

import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BsTreeviewModule } from '@mintplayer/ng-bootstrap/treeview';

@Component({
  selector: 'demo-treeview',
  templateUrl: './treeview.component.html',
  styleUrls: ['./treeview.component.scss'],
  standalone: true,
  imports: [BsTreeviewModule]
})
export class TreeviewComponent {
  constructor() {
    import('bootstrap-icons/icons/inbox-fill.svg').then((icon) => {
      this.inboxFill = this.sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/building.svg').then((icon) => {
      this.building = this.sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/people-fill.svg').then((icon) => {
      this.peopleFill = this.sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/person-bounding-box.svg').then((icon) => {
      this.personBoundingBox = this.sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/inbox.svg').then((icon) => {
      this.inbox = this.sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/archive-fill.svg').then((icon) => {
      this.archiveFill = this.sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/calendar3.svg').then((icon) => {
      this.calendar3 = this.sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/person-lines-fill.svg').then((icon) => {
      this.personLinesFill = this.sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/trash-fill.svg').then((icon) => {
      this.trashFill = this.sanitizer.bypassSecurityTrustHtml(icon.default);
    });
  }

  sanitizer = inject(DomSanitizer);
  inboxFill?: SafeHtml;
  building?: SafeHtml;
  peopleFill?: SafeHtml;
  personBoundingBox?: SafeHtml;
  inbox?: SafeHtml;
  archiveFill?: SafeHtml;
  calendar3?: SafeHtml;
  personLinesFill?: SafeHtml;
  trashFill?: SafeHtml;
}
