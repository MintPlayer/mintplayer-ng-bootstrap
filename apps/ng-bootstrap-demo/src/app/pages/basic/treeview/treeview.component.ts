/// <reference types="../../../../types" />

import { Component, signal } from '@angular/core';
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
      this.inboxFill.set(sanitizer.bypassSecurityTrustHtml(icon.default));
    });
    import('bootstrap-icons/icons/building.svg').then((icon) => {
      this.building.set(sanitizer.bypassSecurityTrustHtml(icon.default));
    });
    import('bootstrap-icons/icons/people-fill.svg').then((icon) => {
      this.peopleFill.set(sanitizer.bypassSecurityTrustHtml(icon.default));
    });
    import('bootstrap-icons/icons/person-bounding-box.svg').then((icon) => {
      this.personBoundingBox.set(sanitizer.bypassSecurityTrustHtml(icon.default));
    });
    import('bootstrap-icons/icons/inbox.svg').then((icon) => {
      this.inbox.set(sanitizer.bypassSecurityTrustHtml(icon.default));
    });
    import('bootstrap-icons/icons/archive-fill.svg').then((icon) => {
      this.archiveFill.set(sanitizer.bypassSecurityTrustHtml(icon.default));
    });
    import('bootstrap-icons/icons/calendar3.svg').then((icon) => {
      this.calendar3.set(sanitizer.bypassSecurityTrustHtml(icon.default));
    });
    import('bootstrap-icons/icons/person-lines-fill.svg').then((icon) => {
      this.personLinesFill.set(sanitizer.bypassSecurityTrustHtml(icon.default));
    });
    import('bootstrap-icons/icons/trash-fill.svg').then((icon) => {
      this.trashFill.set(sanitizer.bypassSecurityTrustHtml(icon.default));
    });
  }

  inboxFill = signal<SafeHtml | undefined>(undefined);
  building = signal<SafeHtml | undefined>(undefined);
  peopleFill = signal<SafeHtml | undefined>(undefined);
  personBoundingBox = signal<SafeHtml | undefined>(undefined);
  inbox = signal<SafeHtml | undefined>(undefined);
  archiveFill = signal<SafeHtml | undefined>(undefined);
  calendar3 = signal<SafeHtml | undefined>(undefined);
  personLinesFill = signal<SafeHtml | undefined>(undefined);
  trashFill = signal<SafeHtml | undefined>(undefined);
}
