import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsTypeaheadComponent, BsTypeaheadItemDirective, inMemoryTypeaheadProvider, TypeaheadRequest } from '@mintplayer/ng-bootstrap/typeahead';
import { dedent } from 'ts-dedent';

interface Artist {
  id: number;
  text: string;
  genre: string;
}

const ARTISTS: Artist[] = [
  { id: 1, text: 'Michael Jackson', genre: 'Pop' },
  { id: 2, text: 'Paul Spencer', genre: 'Rock' },
  { id: 3, text: 'Noel Gallagher', genre: 'Britpop' },
  { id: 4, text: 'Chris Martin', genre: 'Alternative' },
  { id: 5, text: 'Michael Bublé', genre: 'Jazz' },
];

@Component({
  selector: 'demo-typeahead',
  templateUrl: './typeahead.component.html',
  styleUrls: ['./typeahead.component.scss'],
  imports: [BsCodeSnippetComponent, BsTypeaheadComponent, BsTypeaheadItemDirective, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypeaheadComponent {
  readonly artists = ARTISTS;
  /** An in-memory list: instant answers, so no debounce. */
  readonly instant = inMemoryTypeaheadProvider(ARTISTS);

  /**
   * A slow "server": answers after 1.5 s and honours the abort signal, which is
   * what makes a superseded request stop (type "mi", then quickly "mich").
   */
  readonly slow = (term: string, { signal }: TypeaheadRequest): Promise<Artist[]> =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(ARTISTS.filter((a) => a.text.toLowerCase().includes(term.toLowerCase()))), 1500);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
        this.aborted.update((n) => n + 1);
      });
    });

  readonly aborted = signal(0);
  readonly selected = signal<Artist | null>(null);
  readonly submitted = signal<string | null>(null);
  street = '';

  /** Splits a label around the matched term for the highlighted row template. */
  parts(text: string, term: string): { before: string; match: string; after: string } {
    const i = term ? text.toLowerCase().indexOf(term.trim().toLowerCase()) : -1;
    if (i < 0) return { before: text, match: '', after: '' };
    return { before: text.slice(0, i), match: text.slice(i, i + term.trim().length), after: text.slice(i + term.trim().length) };
  }

  protected readonly snippetProviderHtml = dedent`
    <bs-typeahead
      [provider]="search"
      [debounceMs]="200"
      [minLength]="2"
      inputLabel="Artist"
      (select)="onSelect($event)"
      (submitted)="onSubmit($event)"
    ></bs-typeahead>
  `;

  protected readonly snippetProviderTs = dedent`
    import { Component } from '@angular/core';
    import { HttpClient } from '@angular/common/http';
    import { BsTypeaheadComponent, TypeaheadRequest } from '@mintplayer/ng-bootstrap/typeahead';

    interface Artist { id: number; text: string }

    @Component({
      selector: 'my-typeahead-demo',
      templateUrl: './my-typeahead-demo.component.html',
      imports: [BsTypeaheadComponent],
    })
    export class MyTypeaheadDemoComponent {
      constructor(private http: HttpClient) {}

      // Called once per settled term. Returning an Observable is fine: it is
      // unsubscribed (the HTTP request cancelled) when a newer term supersedes it.
      search = (term: string, request: TypeaheadRequest) =>
        this.http.get<Artist[]>('/api/artists', { params: { q: term } });

      onSelect(item: Artist) { console.log('selected', item); }
      onSubmit(term: string) { console.log('submit', term); }
    }
  `;

  protected readonly snippetTemplateHtml = dedent`
    <bs-typeahead [provider]="search">
      <ng-container *bsTypeaheadItem="let artist; let term = term; of: artists">
        <strong>{{ artist.text }}</strong> <small class="text-secondary">{{ artist.genre }}</small>
      </ng-container>
    </bs-typeahead>
  `;

  protected readonly snippetFormsHtml = dedent`
    <!-- The value is the text; a pick writes the item's text. selectedItem() holds the item. -->
    <bs-typeahead #street="ngModel" name="street" [(ngModel)]="model.street" [provider]="streets" required></bs-typeahead>
    <!-- Reactive forms work the same way: formControlName="street" -->
  `;
}
