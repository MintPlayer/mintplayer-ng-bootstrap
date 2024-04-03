/// <reference types="../../../../types" />

import { Component } from '@angular/core';
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
  constructor(private sanitizer: DomSanitizer) {
    import('bootstrap-icons/icons/inbox-fill.svg').then((icon) => {
      this.inboxFill = sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/building.svg').then((icon) => {
      this.building = sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/people-fill.svg').then((icon) => {
      this.peopleFill = sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/person-bounding-box.svg').then((icon) => {
      this.personBoundingBox = sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/inbox.svg').then((icon) => {
      this.inbox = sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/archive-fill.svg').then((icon) => {
      this.archiveFill = sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/calendar3.svg').then((icon) => {
      this.calendar3 = sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/person-lines-fill.svg').then((icon) => {
      this.personLinesFill = sanitizer.bypassSecurityTrustHtml(icon.default);
    });
    import('bootstrap-icons/icons/trash-fill.svg').then((icon) => {
      this.trashFill = sanitizer.bypassSecurityTrustHtml(icon.default);
    });
  }

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
