import { Component } from '@angular/core';
import * as dedent from 'dedent';

@Component({
  selector: 'demo-linify',
  templateUrl: './linify.component.html',
  styleUrls: ['./linify.component.scss']
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
