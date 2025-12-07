import { Component, inject } from '@angular/core';
import { Artist } from '../../../entities/artist';
import { SubjectService } from '../../../services/subject/subject.service';
import { ESubjectType } from '../../../enums/subject-type';
import { BsFormModule } from '@mintplayer/ng-bootstrap/form';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsSearchboxModule } from '@mintplayer/ng-bootstrap/searchbox';
import { JsonPipe } from '@angular/common';

@Component({
  selector: 'demo-searchbox',
  templateUrl: './searchbox.component.html',
  styleUrls: ['./searchbox.component.scss'],
  standalone: true,
  imports: [JsonPipe, BsFormModule, BsGridModule, BsSearchboxModule]
})
export class SearchboxComponent {

  subjectService = inject(SubjectService);

  suggestions: Artist[] = [
    // { id: 1, name: 'Dario G', yearStarted: 1997, yearQuit: null, media: [], tags: [], text: 'Dario G' },
    // { id: 2, name: 'Oasis', yearStarted: 1980, yearQuit: null, media: [], tags: [], text: 'Oasis' },
  ];
  selectedArtist?: Artist;

  async onProvideSuggestions(searchterm: string) {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    const artists = await this.subjectService.suggestAsync(searchterm, [ESubjectType.artist], false);
    this.suggestions = artists.map((s) => <Artist>s);
  }

}