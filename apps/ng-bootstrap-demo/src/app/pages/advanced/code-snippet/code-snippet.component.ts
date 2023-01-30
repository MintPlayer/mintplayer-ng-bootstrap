import { Component } from '@angular/core';
import * as dedent from 'dedent';

@Component({
  selector: 'demo-code-snippet',
  templateUrl: './code-snippet.component.html',
  styleUrls: ['./code-snippet.component.scss']
})
export class CodeSnippetComponent {

  html = dedent`
    <bs-datatable #tabel [settings]="settings" [data]="artists" (reloadData)="loadArtists()">
      <div *bsDatatableColumn="{ sortable: true, name: 'Name' }">
        1. Artist
      </div>
      <div *bsDatatableColumn="{ sortable: true, name: 'YearStarted' }">
        2. Year started
      </div>
      <div *bsDatatableColumn="{ sortable: true, name: 'YearQuit' }">
        3. Year quit
      </div>

      <tr *bsRowTemplate="let artist">
        <td class="text-nowrap">{{ artist.name }}</td>
        <td class="text-nowrap">{{ artist.yearStarted }}</td>
        <td class="text-nowrap">{{ artist.yearQuit }}</td>
      </tr>
    </bs-datatable>`;

}
