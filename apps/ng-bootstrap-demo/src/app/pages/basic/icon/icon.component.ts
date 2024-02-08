import { Component } from '@angular/core';
import dedent from 'ts-dedent';


@Component({
  selector: 'demo-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss']
})
export class IconComponent {

  iconLoader = () => import('bootstrap-icons/icons/bootstrap.svg');

  componentCode = dedent`
  ...
  import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

  export class IconComponent {
    iconLoader = () => import('bootstrap-icons/icons/bootstrap.svg');
  }`;

  htmlCode = `<span [innerHTML]="iconLoader | bsIcon | async"></span>`;

  angularJson = dedent`
  {
    "projects": {
      "xxx": {
        "architect": {
          ...,
          "build": {
            ...,
            "options": {
              ...,
              "loader": {
                ".svg": "text"
              }
            }
          }
        }
      }
    }
  }
  `;

  projectJson = dedent`
  {
    "targets": {
      "build": {
        "options": {
          ...,
          "loader": {
            ".svg": "text"
          }
        }
      },
      ...
    },
    ...
  }
  `;

  typesDTs = dedent`
  declare module "*.svg" {
    const content: string;
    export default content;
  }`;

}
