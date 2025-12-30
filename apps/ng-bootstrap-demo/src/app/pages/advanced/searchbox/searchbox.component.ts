import { Component, inject, signal } from '@angular/core';
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

  suggestions = signal<Artist[]>([]);
  selectedArtist = signal<Artist | undefined>(undefined);

  async onProvideSuggestions(searchterm: string) {
    // Simulate delay like the original implementation
    await new Promise(resolve => setTimeout(resolve, 2000));
    const artists = await this.subjectService.suggest(searchterm, [ESubjectType.artist], false);
    this.suggestions.set(artists.map(s => s as Artist));
  }

}