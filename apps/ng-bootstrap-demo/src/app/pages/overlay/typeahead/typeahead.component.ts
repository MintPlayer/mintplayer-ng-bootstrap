import { JsonPipe } from '@angular/common';
import { Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'demo-typeahead',
  templateUrl: './typeahead.component.html',
  styleUrls: ['./typeahead.component.scss']
})
export class TypeaheadComponent {

  constructor(private jsonPipe: JsonPipe) { }

  searchterm = '';
  suggestions$ = new BehaviorSubject<any[]>([]);
  items: any[] = [
    { id: 1, firstName: 'Michael', lastName: 'Jackson', text: 'Michael Jackson' },
    { id: 2, firstName: 'Paul', lastName: 'Spencer', text: 'Paul Spencer' },
    { id: 3, firstName: 'Noel', lastName: 'Gallagher', text: 'Noel Gallagher' },
    { id: 4, firstName: 'Chris', lastName: 'Martin', text: 'Chris Martin' }
  ];
  provideSuggestions(searchTerm: string) {
    this.suggestions$.next(this.items.filter(i => (i.firstName + ' ' + i.lastName).indexOf(searchTerm) > -1));
  }
  gotoArtist(suggestion: any) {
    alert('Selected value:\r\n' + this.jsonPipe.transform(suggestion));
  }
  doSearch(searchTerm: string) {
    alert(`Search for ${searchTerm} now`);
  }

}
