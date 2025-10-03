import { Component, inject, Inject, model, signal } from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { Tag } from '../../../entities/tag';
import { TagService } from '../../../services/tag/tag.service';
import { BsGridModule } from '@mintplayer/ng-bootstrap/grid';
import { BsModalModule } from '@mintplayer/ng-bootstrap/modal';
import { BsSelect2Module } from '@mintplayer/ng-bootstrap/select2';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { BsFontColorPipe } from '@mintplayer/ng-bootstrap/font-color';
import { GIT_REPO } from '../../../providers/git-repo.provider';

@Component({
  selector: 'demo-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  standalone: true,
  imports: [BsGridModule, BsModalModule, BsSelect2Module, BsButtonTypeDirective, FocusOnLoadDirective, BsFontColorPipe]
})
export class ModalComponent {

  isOpen = signal(false);
  colors = Color;
  gitRepo = inject(GIT_REPO);
  tagService = inject(TagService);
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
