import { Component, DestroyRef, inject } from '@angular/core';
import { Artist } from '../../../entities/artist';
import { Tag } from '../../../entities/tag';
import { ESubjectType } from '../../../enums/subject-type';
import { SubjectService } from '../../../services/subject/subject.service';
import { TagService } from '../../../services/tag/tag.service';
import { BsSelect2Module } from '@mintplayer/ng-bootstrap/select2';
import { BsFontColorPipe } from '@mintplayer/ng-bootstrap/font-color';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
  destroy = inject(DestroyRef);

  artistSuggestions: Artist[] = [];
  tagSuggestions: Tag[] = [];
  selectedTags: Tag[] = [];

  onProvideArtistSuggestions(search: string) {
    this.subjectService.suggest(search, [ESubjectType.artist])
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(artists => this.artistSuggestions = artists.map(s => <Artist>s));
  }
  onProvideTagSuggestions(search: string) {
    this.tagService.suggestTags(search, true).then((tags) => {
      if (tags) {
        this.tagSuggestions = tags;
      }
    });
  }

}
