import { Component } from '@angular/core';
import * as dedent from "dedent";
import { SlideUpDownNgifAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'demo-collapse',
  templateUrl: './collapse.component.html',
  styleUrls: ['./collapse.component.scss'],
  animations: [SlideUpDownNgifAnimation]
})
export class CollapseComponent {

  collapseVisible = false;
  colors = Color;

  exampleModule = dedent`
    import { NgModule } from '@angular/core';
    import { CommonModule } from '@angular/common';
    import { CollapseComponent } from './collapse.component';

    @NgModule({
      declarations: [CollapseComponent],
      imports: [CommonModule]
    })
    export class CollapseModule { }`;
  exampleHtml = dedent`
    <button (click)="collapseVisible = !collapseVisible">Expand/collapse</button>
    <div class="overflow-hidden" *ngIf="collapseVisible" [@slideUpDownNgif]>
      Content
    </div>`;
  exampleTs = dedent`
    import { Component } from '@angular/core';
    import { SlideUpDownNgifAnimation } from '@mintplayer/ng-animations';

    @Component({
      selector: '...',
      templateUrl: '...',
      styleUrls: [...],
      animations: [SlideUpDownNgifAnimation]
    })
    export class CollapseComponent {
      collapseVisible = false;
    }`;

}
