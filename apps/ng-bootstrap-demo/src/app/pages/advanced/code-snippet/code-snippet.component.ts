import { Component, ChangeDetectionStrategy} from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-code-snippet',
  templateUrl: './code-snippet.component.html',
  styleUrls: ['./code-snippet.component.scss'],
  imports: [BsCodeSnippetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeSnippetComponent {

  html = dedent`
    <bs-datatable #tabel [settings]="settings" (settingsChange)="loadArtists()">
      <div *bsDatatableColumn="'Name'; sortable: true">
        1. Artist
      </div>
      <div *bsDatatableColumn="'YearStarted'; sortable: true">
        2. Year started
      </div>
      <div *bsDatatableColumn="'YearQuit'; sortable: true">
        3. Year quit
      </div>

      <tr *bsRowTemplate="let artist of artists">
        <td class="text-nowrap">{{ artist.name }}</td>
        <td class="text-nowrap">{{ artist.yearStarted }}</td>
        <td class="text-nowrap">{{ artist.yearQuit }}</td>
      </tr>
    </bs-datatable>`;

}
