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
      <ng-template bsDatatableColumn="Name">Artist</ng-template>
      <ng-template bsDatatableColumn="YearStarted">Year started</ng-template>
      <ng-template bsDatatableColumn="YearQuit">Year quit</ng-template>

      <ng-template bsRowTemplate let-artist>
        <td class="text-nowrap">{{ artist?.name }}</td>
        <td class="text-nowrap">{{ artist?.yearStarted }}</td>
        <td class="text-nowrap">{{ artist?.yearQuit }}</td>
      </ng-template>
    </bs-datatable>`;

}
