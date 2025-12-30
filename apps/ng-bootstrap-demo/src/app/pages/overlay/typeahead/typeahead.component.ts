import { JsonPipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { BsTypeaheadComponent } from '@mintplayer/ng-bootstrap/typeahead';

@Component({
  selector: 'demo-typeahead',
  templateUrl: './typeahead.component.html',
  styleUrls: ['./typeahead.component.scss'],
  standalone: true,
  imports: [BsTypeaheadComponent, JsonPipe],
  providers: [JsonPipe]
})
export class TypeaheadComponent {

  constructor(private jsonPipe: JsonPipe) { }

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

}
