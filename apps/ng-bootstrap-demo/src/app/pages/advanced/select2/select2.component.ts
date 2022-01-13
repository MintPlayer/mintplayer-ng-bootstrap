import { Component } from '@angular/core';
import { Artist, SubjectService, SubjectType, Tag, TagService } from '@mintplayer/ng-client';

@Component({
  selector: 'demo-select2',
  templateUrl: './select2.component.html',
  styleUrls: ['./select2.component.scss']
})
export class Select2Component {

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
