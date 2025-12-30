import { Component, inject, signal } from '@angular/core';
import { Artist } from '../../../entities/artist';
import { Tag } from '../../../entities/tag';
import { ESubjectType } from '../../../enums/subject-type';
import { SubjectService } from '../../../services/subject/subject.service';
import { TagService } from '../../../services/tag/tag.service';
import { BsSelect2Module } from '@mintplayer/ng-bootstrap/select2';
import { BsFontColorPipe } from '@mintplayer/ng-bootstrap/font-color';

@Component({
  selector: 'demo-select2',
  templateUrl: './select2.component.html',
  styleUrls: ['./select2.component.scss'],
  standalone: true,
  imports: [BsSelect2Module, BsFontColorPipe]
})
export class Select2Component {

  subjectService = inject(SubjectService);
  tagService = inject(TagService);

  artistSuggestions = signal<Artist[]>([]);
  tagSuggestions = signal<Tag[]>([]);
  selectedTags = signal<Tag[]>([]);

  async onProvideArtistSuggestions(search: string) {
    const artists = await this.subjectService.suggest(search, [ESubjectType.artist]);
    this.artistSuggestions.set(artists.map(s => s as Artist));
  }
  async onProvideTagSuggestions(search: string) {
    const tags = await this.tagService.suggestTags(search, true);
    if (tags) {
      this.tagSuggestions.set(tags);
    }
  }

}
