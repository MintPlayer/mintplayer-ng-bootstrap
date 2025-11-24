import { Component } from '@angular/core';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridColumnDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';

@Component({
  selector: 'demo-for-directive',
  templateUrl: './for-directive.component.html',
  styleUrls: ['./for-directive.component.scss'],
  imports: [BsForDirective, BsFormModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective]
})
export class ForDirectiveComponent {}
