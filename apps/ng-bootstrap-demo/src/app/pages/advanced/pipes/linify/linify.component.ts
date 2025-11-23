import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridColumnDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsLinifyPipe } from '@mintplayer/ng-bootstrap/linify';
import { BsListGroupComponent, BsListGroupItemComponent } from '@mintplayer/ng-bootstrap/list-group';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-linify',
  templateUrl: './linify.component.html',
  styleUrls: ['./linify.component.scss'],
  imports: [FormsModule, BsFormModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsLinifyPipe, BsListGroupComponent, BsListGroupItemComponent, BsToggleButtonComponent]
})
export class LinifyComponent {
  text = dedent`
    See the stone set in your eyes
    See the thorn twist in your side
    I'll wait for you

    Sleight of hand and twist of fate
    On a bed of nails, she makes me wait
    And I wait without you`;
  removeEmptyEntries = true;
}
