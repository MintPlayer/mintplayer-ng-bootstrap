import { Component } from '@angular/core';

@Component({
  selector: 'demo-code-snippet',
  templateUrl: './code-snippet.component.html',
  styleUrls: ['./code-snippet.component.scss']
})
export class CodeSnippetComponent {

  html =
`<bs-datatable #tabel [settings]="settings" [data]="artists" (reloadData)="loadArtists()">
  <div *bsDatatableColumn="{ sortable: true, name: 'Name' }">
    1. Artist
  </div>
  <div *bsDatatableColumn="{ sortable: true, name: 'YearStarted' }">
    2. Year started
  </div>
  <div *bsDatatableColumn="{ sortable: true, name: 'YearQuit' }">
    3. Year quit
  </div>

  <ng-template bsRowTemplate let-artist>
    <tr>
      <td class="text-nowrap">{{ artist.name }}</td>
      <td class="text-nowrap">{{ artist.yearStarted }}</td>
      <td class="text-nowrap">{{ artist.yearQuit }}</td>
    </tr>
  </ng-template>
</bs-datatable>`;

}
