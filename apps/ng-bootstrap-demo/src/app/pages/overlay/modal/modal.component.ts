import { Component, Inject, signal } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { Tag } from '../../../entities/tag';
import { TagService } from '../../../services/tag/tag.service';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsModalModule } from '@mintplayer/ng-bootstrap/modal';
import { BsSelect2Module } from '@mintplayer/ng-bootstrap/select2';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { BsFontColorPipe } from '@mintplayer/ng-bootstrap/font-color';

@Component({
  selector: 'demo-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  standalone: true,
  imports: [BsGridModule, BsModalModule, BsSelect2Module, BsButtonTypeDirective, FocusOnLoadDirective, BsFontColorPipe]
})
export class ModalComponent {
  constructor(private tagService: TagService, @Inject('GIT_REPO') gitRepo: string) {
    this.gitRepo = gitRepo;
  }

  isOpen = false;
  colors = Color;
  gitRepo: string;
  tagSuggestions = signal<Tag[]>([]);
  selectedTags = signal<Tag[]>([]);

  onProvideTagSuggestions(search: string) {
    this.tagService.suggestTags(search, true).then((tags) => {
      if (tags) {
        this.tagSuggestions.set(tags);
      }
    });
  }
}
