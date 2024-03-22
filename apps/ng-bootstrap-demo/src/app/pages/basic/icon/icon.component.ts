/// <reference types="../../../../types" />

import { Component } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Color } from '@mintplayer/ng-bootstrap';
import * as dedent from 'dedent';

@Component({
  selector: 'demo-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss']
})
export class IconComponent {
  constructor(private sanitizer: DomSanitizer) {
    import('bootstrap-icons/icons/bootstrap.svg').then((icon) => {
      this.icon = sanitizer.bypassSecurityTrustHtml(icon.default);
    });
  }

  colors = Color;
  icon?: SafeHtml;

  componentCode = dedent`
    constructor(private sanitizer: DomSanitizer) {
      import('bootstrap-icons/icons/bootstrap.svg').then((icon) => {
        this.icon = sanitizer.bypassSecurityTrustHtml(icon.default);
      });
    }

    icon?: SafeHtml;`;

  htmlCode = `<span [innerHTML]="icon"></span>`;

  typesCode = dedent`
    declare module "*.svg" {
      const content: string;
      export default content;
    }`;

  angularJsonCode = dedent`
    {
      ...,
      "architect": {
        ...,
        "build": {
          ...,
          "builderOrExecutor": "@angular-devkit/build-angular:application",
          "options": {
            ...,
            "loader": {
              ".svg": "text"
            }
          }
        }
      }
    }`;
}
