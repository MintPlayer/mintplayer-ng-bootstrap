import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import type { CodeLineAnnotation } from '@mintplayer/web-components/code-snippet';
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
        Artist
      </div>
      <div *bsDatatableColumn="'YearStarted'; sortable: true">
        Year started
      </div>
      <div *bsDatatableColumn="'YearQuit'; sortable: true">
        Year quit
      </div>

      <ng-container *bsRowTemplate="let artist of artists">
        <td class="text-nowrap">{{ artist.name }}</td>
        <td class="text-nowrap">{{ artist.yearStarted }}</td>
        <td class="text-nowrap">{{ artist.yearQuit }}</td>
      </ng-container>
    </bs-datatable>`;

  sample = dedent`
    export function total(items: Item[]): number {
      let sum = 0;
      for (const item of items) {
        if (item.taxable) {
          sum += item.price * 1.21;
        } else {
          sum += item.price;
        }
      }
      return sum;
    }`;

  /** Coverage-shaped, but the component knows nothing about coverage: `kind`
   *  is an opaque string this page happens to style. */
  readonly coverage: CodeLineAnnotation[] = [
    { line: 1, kind: 'covered', label: '1×' },
    { line: 2, kind: 'covered', label: '1×' },
    { line: 3, kind: 'covered', label: '4×' },
    { line: 4, kind: 'partial', label: '4×', secondaryLabel: '1/2', description: 'Branches: 1 of 2 taken' },
    { line: 5, kind: 'covered', label: '3×' },
    { line: 6, kind: 'uncovered', label: '0' },
    { line: 7, kind: 'uncovered', label: '0' },
    { line: 9, kind: 'covered', label: '1×' },
  ];

  readonly activeLine = signal<number | null>(4);

  onLineActivate(line: number): void {
    this.activeLine.set(line);
  }

  snippetLineNumbers = dedent`
    <bs-code-snippet [code]="source" [language]="'ts'" [lineNumbers]="true" />`;

  snippetTheme = dedent`
    <!-- follows data-bs-theme by default -->
    <bs-code-snippet [code]="source" [language]="'ts'" />

    <!-- or pin it -->
    <bs-code-snippet [code]="source" [language]="'ts'" [theme]="'dark'" />`;

  snippetAnnotations = dedent`
    <bs-code-snippet
      [code]="source"
      [language]="'ts'"
      [lineNumbers]="true"
      [annotations]="coverage"
      [activeLine]="activeLine()"
      [lineHref]="lineHref"
      (lineActivate)="activeLine.set($event)" />`;

  snippetAnnotationsTs = dedent`
    readonly coverage: CodeLineAnnotation[] = [
      { line: 4, kind: 'partial', label: '4×', secondaryLabel: '1/2',
        description: 'Branches: 1 of 2 taken' },
      { line: 6, kind: 'uncovered', label: '0' },
    ];

    // \`kind\` is opaque — style it from your own stylesheet:
    //   bs-code-snippet::part(annotation-uncovered) { background: rgba(220,53,69,.14); }
    lineHref = (line: number) => \`#L\${line}\`;`;

  /** A real href, so middle-click and open-in-new-tab work; the cancelable
   *  `lineActivate` is what a router-driven app would intercept. */
  lineHref = (line: number) => `#L${line}`;
}
