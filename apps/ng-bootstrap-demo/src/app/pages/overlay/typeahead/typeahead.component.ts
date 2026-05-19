import { JsonPipe } from '@angular/common';
import { Component, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsTypeaheadComponent } from '@mintplayer/ng-bootstrap/typeahead';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-typeahead',
  templateUrl: './typeahead.component.html',
  styleUrls: ['./typeahead.component.scss'],
  imports: [BsCodeSnippetComponent, BsTypeaheadComponent],
  providers: [JsonPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TypeaheadComponent {

  private jsonPipe = inject(JsonPipe);


  searchterm = signal('');
  suggestions = signal<any[]>([]);
  items: any[] = [
    { id: 1, firstName: 'Michael', lastName: 'Jackson', text: 'Michael Jackson' },
    { id: 2, firstName: 'Paul', lastName: 'Spencer', text: 'Paul Spencer' },
    { id: 3, firstName: 'Noel', lastName: 'Gallagher', text: 'Noel Gallagher' },
    { id: 4, firstName: 'Chris', lastName: 'Martin', text: 'Chris Martin' }
  ];
  provideSuggestions(searchTerm: string) {
    setTimeout(() => {
      this.suggestions.set(this.items.filter(i => (i.firstName + ' ' + i.lastName).indexOf(searchTerm) > -1));
    }, 3000);
  }
  gotoArtist(suggestion: any) {
    alert('Selected value:\r\n' + this.jsonPipe.transform(suggestion));
  }
  doSearch(searchTerm: string) {
    alert(`Search for ${searchTerm} now`);
  }

  protected readonly snippetBasicHtml = dedent`
    <bs-typeahead
      [(searchterm)]="searchterm"
      [suggestions]="suggestions()"
      (provideSuggestions)="provideSuggestions($event)"
      (suggestionSelected)="onSelect($event)"
      (submitted)="onSubmit($event)"
    ></bs-typeahead>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { BsTypeaheadComponent } from '@mintplayer/ng-bootstrap/typeahead';

    type Artist = { id: number; text: string };

    @Component({
      selector: 'my-typeahead-demo',
      templateUrl: './my-typeahead-demo.component.html',
      imports: [BsTypeaheadComponent],
    })
    export class MyTypeaheadDemoComponent {
      readonly searchterm = signal('');
      readonly suggestions = signal<Artist[]>([]);

      private readonly items: Artist[] = [
        { id: 1, text: 'Michael Jackson' },
        { id: 2, text: 'Paul Spencer' },
      ];

      provideSuggestions(term: string) {
        this.suggestions.set(this.items.filter(i => i.text.includes(term)));
      }

      onSelect(item: Artist) {
        console.log('selected', item);
      }

      onSubmit(term: string) {
        console.log('submit', term);
      }
    }
  `;

}
