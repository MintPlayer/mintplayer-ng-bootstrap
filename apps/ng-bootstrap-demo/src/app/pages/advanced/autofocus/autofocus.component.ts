import { Component, inject, signal } from '@angular/core';
import { BsSelect2Module } from '@mintplayer/ng-bootstrap/select2';
import { BsFontColorPipe } from '@mintplayer/ng-bootstrap/font-color';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { Artist } from '../../../entities/artist';
import { Tag } from '../../../entities/tag';
import { ESubjectType } from '../../../enums/subject-type';
import { SubjectService } from '../../../services/subject/subject.service';
import { TagService } from '../../../services/tag/tag.service';

@Component({
  selector: 'demo-autofocus',
  templateUrl: './autofocus.component.html',
  styleUrls: ['./autofocus.component.scss'],
  standalone: true,
  imports: [BsSelect2Module, BsFontColorPipe, FocusOnLoadDirective],
})
export class AutofocusComponent {

  subjectService = inject(SubjectService);
  tagService = inject(TagService);

  artistSuggestions = signal<Artist[]>([]);
  tagSuggestions = signal<Tag[]>([]);
  selectedTags: Tag[] = [];

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
