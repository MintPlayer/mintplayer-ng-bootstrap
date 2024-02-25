import { Component, ElementRef, ViewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss']
})
export class IconComponent {
  constructor(domSanitizer: DomSanitizer) {
    import('bootstrap-icons/icons/bootstrap.svg').then((icon) => {
      this.icon = domSanitizer.bypassSecurityTrustHtml(icon.default);
    });
  }

  colors = Color;
  icon?: SafeHtml;
}
