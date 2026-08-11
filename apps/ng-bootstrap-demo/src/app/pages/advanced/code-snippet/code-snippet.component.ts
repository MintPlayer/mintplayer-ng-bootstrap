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

  /**
   * The event is cancelable, and this page handles the "navigation" itself by
   * moving the active line — so it cancels. Without the cancel the anchor's own
   * navigation runs as well.
   *
   * A modified or middle click never reaches here: the element leaves those to
   * the browser so open-in-new-tab still works.
   */
  onLineActivate(event: CustomEvent<{ line: number }>): void {
    event.preventDefault();
    this.activeLine.set(event.detail.line);
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
      (lineActivate)="onLineActivate($event)" />`;

  snippetAnnotationsTs = dedent`
    readonly coverage: CodeLineAnnotation[] = [
      { line: 4, kind: 'partial', label: '4×', secondaryLabel: '1/2',
        description: 'Branches: 1 of 2 taken' },
      { line: 6, kind: 'uncovered', label: '0' },
    ];

    // \`kind\` is opaque — style it from your own stylesheet. Through the
    // Angular wrapper the part lives on the inner element:
    //   .coverage ::ng-deep mp-code-snippet::part(annotation-uncovered) { … }
    lineHref = (line: number) => \`#L\${line}\`;

    // The event is CANCELABLE. Cancel it when you handle the activation
    // yourself, or the anchor navigates as well. Modified and middle clicks
    // never reach here, so open-in-new-tab keeps working.
    onLineActivate(event: CustomEvent<{ line: number }>) {
      event.preventDefault();
      this.activeLine.set(event.detail.line);
    }

    // A fragment does NOT scroll to the line: the row lives in a shadow root,
    // so document.getElementById('L7') is null. Read the fragment on
    // navigation and drive it explicitly instead:
    //   viewChild(BsCodeSnippetComponent).scrollToLine(n)`;

  snippetSized = dedent`
    <bs-code-snippet
      class="sized-snippet"
      [code]="source"
      [language]="'html'"
      [lineNumbers]="true" />`;

  snippetSizedCss = dedent`
    /* Any height constraint works — the code area scrolls inside it. */
    .sized-snippet {
      max-height: 220px;
    }`;

  /**
   * A real href, so middle-click / open-in-new-tab / copy-link-address work.
   * A bare fragment is safe — the element resolves it against the current URL
   * rather than letting `<base href="/">` send it to the site root.
   */
  lineHref = (line: number) => `#L${line}`;
}
