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
    <bs-datatable
      [data]="artists()"
      [(settings)]="settings"
      [columns]="columns()">
    </bs-datatable>`;

}
