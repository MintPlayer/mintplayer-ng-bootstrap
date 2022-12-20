import { Component, Inject } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { Tag } from '../../../entities/tag';
import { TagService } from '../../../services/tag/tag.service';

@Component({
  selector: 'demo-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent {
  constructor(private tagService: TagService, @Inject('GIT_REPO') gitRepo: string) {
    this.gitRepo = gitRepo;
  }

  isOpen = false;
  colors = Color;
  gitRepo: string;
  tagSuggestions: Tag[] = [];
  selectedTags: Tag[] = [];

  onProvideTagSuggestions(search: string) {
    this.tagService.suggestTags(search, true).then((tags) => {
      if (tags) {
        this.tagSuggestions = tags;
      }
    });
  }
}
