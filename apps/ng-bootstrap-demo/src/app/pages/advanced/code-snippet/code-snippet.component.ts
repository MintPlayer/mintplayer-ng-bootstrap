import { Component } from '@angular/core';
import dedent from 'dedent';

@Component({
  selector: 'demo-code-snippet',
  templateUrl: './code-snippet.component.html',
  styleUrls: ['./code-snippet.component.scss']
})
export class CodeSnippetComponent {

  html = dedent`
    <bs-datatable #tabel [settings]="settings" [data]="artists" (reloadData)="loadArtists()">
      <div *bsDatatableColumn="'Name'; sortable: true">
        1. Artist
      </div>
      <div *bsDatatableColumn="'YearStarted'; sortable: true">
        2. Year started
      </div>
      <div *bsDatatableColumn="'YearQuit'; sortable: true">
        3. Year quit
      </div>

      <tr *bsRowTemplate="let artist">
        <td class="text-nowrap">{{ artist.name }}</td>
        <td class="text-nowrap">{{ artist.yearStarted }}</td>
        <td class="text-nowrap">{{ artist.yearQuit }}</td>
      </tr>
    </bs-datatable>`;

}
