import { Component } from '@angular/core';
import { dedent } from 'ts-dedent';
import { SlideUpDownNgifAnimation } from '@mintplayer/ng-animations';
import { Color } from '@mintplayer/ng-bootstrap';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsAlertComponent, BsAlertCloseComponent } from '@mintplayer/ng-bootstrap/alert';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';

@Component({
  selector: 'demo-collapse',
  templateUrl: './collapse.component.html',
  styleUrls: ['./collapse.component.scss'],
  standalone: true,
  imports: [BsGridModule, BsAlertComponent, BsAlertCloseComponent, BsCodeSnippetComponent, BsButtonTypeDirective],
  animations: [SlideUpDownNgifAnimation]
})
export class CollapseComponent {

  collapseVisible = false;
  colors = Color;

  exampleModule = dedent`
    import { NgModule } from '@angular/core';
    import { CollapseComponent } from './collapse.component';

    @NgModule({
      declarations: [CollapseComponent],
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
