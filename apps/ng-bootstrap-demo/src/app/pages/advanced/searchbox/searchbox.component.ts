import { Component, DestroyRef, inject } from '@angular/core';
import { Artist } from '../../../entities/artist';
import { SubjectService } from '../../../services/subject/subject.service';
import { ESubjectType } from '../../../enums/subject-type';
import { delay } from 'rxjs';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridColumnDirective, BsGridComponent, BsGridRowDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsSearchboxModule } from '@mintplayer/ng-bootstrap/searchbox';
import { JsonPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'demo-searchbox',
  templateUrl: './searchbox.component.html',
  styleUrls: ['./searchbox.component.scss'],
  imports: [JsonPipe, BsFormModule, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsSearchboxModule]
})
export class SearchboxComponent {

  subjectService = inject(SubjectService);
  destroy = inject(DestroyRef);

  suggestions: Artist[] = [
    // { id: 1, name: 'Dario G', yearStarted: 1997, yearQuit: null, media: [], tags: [], text: 'Dario G' },
    // { id: 2, name: 'Oasis', yearStarted: 1980, yearQuit: null, media: [], tags: [], text: 'Oasis' },
  ];
  selectedArtist?: Artist;

  onProvideSuggestions(searchterm: string) {
    this.subjectService.suggest(searchterm, [ESubjectType.artist], false)
      .pipe(delay(2000), takeUntilDestroyed(this.destroy))
      .subscribe(artists => this.suggestions = artists.map(s => <Artist>s));
  }

}