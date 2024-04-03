import { Component } from '@angular/core';
import { BsForDirective } from '@mintplayer/ng-bootstrap/for';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';

@Component({
  selector: 'demo-for-directive',
  templateUrl: './for-directive.component.html',
  styleUrls: ['./for-directive.component.scss'],
  standalone: true,
  imports: [BsForDirective, BsFormModule, BsGridModule]
})
export class ForDirectiveComponent {}
