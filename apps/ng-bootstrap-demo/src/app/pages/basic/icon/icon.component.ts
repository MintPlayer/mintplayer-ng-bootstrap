import { Component } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as dedent from 'dedent';

@Component({
  selector: 'demo-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss']
})
export class IconComponent {
  constructor(private sanitizer: DomSanitizer) {
    import('bootstrap-icons/icons/bootstrap.svg').then((res) => res.default).then((icon) => {
      this.icon = sanitizer.bypassSecurityTrustHtml(icon);
    });
  }

  icon?: SafeHtml;

  moduleCode = dedent`
  ...
  import { BsIconModule } from '@mintplayer/ng-bootstrap/icon';
  
  @NgModule({
    declarations: [ ... ],
    imports: [
      ...,
      BsIconModule
    ]
  })
  export class IconModule { }`;

  htmlCode = `<bs-icon [icon]="'bootstrap'"></bs-icon>`;
}
