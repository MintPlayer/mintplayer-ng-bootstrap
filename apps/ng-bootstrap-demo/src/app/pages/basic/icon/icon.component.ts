import { Component } from '@angular/core';
import * as dedent from 'dedent';

@Component({
  selector: 'demo-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss']
})
export class IconComponent {
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
