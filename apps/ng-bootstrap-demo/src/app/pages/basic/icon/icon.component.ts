/// <reference types="../../../../types" />

import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsAlertModule } from '@mintplayer/ng-bootstrap/alert';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';


@Component({
  selector: 'demo-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss'],
  standalone: true,
  imports: [BsAlertModule, BsCodeSnippetComponent]
})
export class IconComponent {
  constructor() {
    import('bootstrap-icons/icons/bootstrap.svg').then((icon) => {
      this.icon = this.domSanitizer.bypassSecurityTrustHtml(icon.default);
    });
  }

  colors = Color;
  icon?: SafeHtml;
  domSanitizer = inject(DomSanitizer);

  componentCode = dedent`
    constructor() {
      import('bootstrap-icons/icons/bootstrap.svg').then((icon) => {
        this.icon = this.domSanitizer.bypassSecurityTrustHtml(icon.default);
      });
    }

    domSanitizer = inject(DomSanitizer);
    icon?: SafeHtml;`;

  htmlCode = `<span [innerHTML]="icon"></span>`;

  typesCode = dedent`
    declare module "*.svg" {
      const content: string;
      export default content;
    }`;

  angularJsonCode = dedent`
    {
      "architect": {
        "build": {
          "builderOrExecutor": "@angular-devkit/build-angular:application",
          "options": {
            "loader": {
              ".svg": "text"
            }
          }
        }
      }
    }`;
}
