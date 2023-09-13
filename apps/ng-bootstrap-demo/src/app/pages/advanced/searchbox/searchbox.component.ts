import { Component } from '@angular/core';
import { Artist } from '../../../entities/artist';
import { SubjectService } from '../../../services/subject/subject.service';
import { ESubjectType } from '../../../enums/subject-type';
import { delay } from 'rxjs';

@Component({
  selector: 'demo-searchbox',
  templateUrl: './searchbox.component.html',
  styleUrls: ['./searchbox.component.scss']
})
export class SearchboxComponent {

  constructor(private subjectService: SubjectService) {}

  suggestions: Artist[] = [
    // { id: 1, name: 'Dario G', yearStarted: 1997, yearQuit: null, media: [], tags: [], text: 'Dario G' },
    // { id: 2, name: 'Oasis', yearStarted: 1980, yearQuit: null, media: [], tags: [], text: 'Oasis' },
  ];
  selectedArtist?: Artist;

  onProvideSuggestions(searchterm: string) {
    this.subjectService.suggest(searchterm, [ESubjectType.artist], false)
      .pipe(delay(2000))
      .subscribe({
        next: artists => this.suggestions = artists.map(s => <Artist>s),
      });
  }

}