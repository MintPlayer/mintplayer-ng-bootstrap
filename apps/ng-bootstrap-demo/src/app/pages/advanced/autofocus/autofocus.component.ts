import { Component } from '@angular/core';
import { Artist, SubjectService, SubjectType, Tag, TagService } from '@mintplayer/ng-client';

@Component({
  selector: 'demo-autofocus',
  templateUrl: './autofocus.component.html',
  styleUrls: ['./autofocus.component.scss']
})
export class AutofocusComponent {

  constructor(private subjectService: SubjectService, private tagService: TagService) { }

  artistSuggestions: Artist[] = [];
  tagSuggestions: Tag[] = [];
  selectedTags: Tag[] = [];

  onProvideArtistSuggestions(search: string) {
    this.subjectService.suggest(search, [SubjectType.artist]).then((artists) => {
      this.artistSuggestions = <Artist[]>artists;
    })
  }
  onProvideTagSuggestions(search: string) {
    this.tagService.suggestTags(search, true).then((tags) => {
      if (tags) {
        this.tagSuggestions = tags;
      }
    })
  }

}
