import { Component } from '@angular/core';
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
  imports: [BsSelect2Module, BsFontColorPipe, FocusOnLoadDirective]
})
export class AutofocusComponent {

  constructor(private subjectService: SubjectService, private tagService: TagService) { }

  artistSuggestions: Artist[] = [];
  tagSuggestions: Tag[] = [];
  selectedTags: Tag[] = [];

  onProvideArtistSuggestions(search: string) {
    this.subjectService.suggest(search, [ESubjectType.artist]).subscribe({
      next: artists => this.artistSuggestions = <Artist[]>artists.map(s => <Artist>s),
    });
  }
  onProvideTagSuggestions(search: string) {
    this.tagService.suggestTags(search, true).then((tags) => {
      if (tags) {
        this.tagSuggestions = tags;
      }
    });
  }

}
