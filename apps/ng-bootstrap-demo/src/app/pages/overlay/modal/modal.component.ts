import { Component, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { Tag } from '../../../entities/tag';
import { TagService } from '../../../services/tag/tag.service';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsModalHostComponent, BsModalDirective, BsModalHeaderDirective, BsModalBodyDirective, BsModalFooterDirective, BsModalCloseDirective } from '@mintplayer/ng-bootstrap/modal';
import { BsSelect2Component, BsItemTemplateDirective } from '@mintplayer/ng-bootstrap/select2';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { BsFontColorPipe } from '@mintplayer/ng-bootstrap/font-color';
import { GIT_REPO } from '../../../providers/git-repo.provider';

@Component({
  selector: 'demo-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  standalone: true,
  imports: [BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsColFormLabelDirective, BsModalHostComponent, BsModalDirective, BsModalHeaderDirective, BsModalBodyDirective, BsModalFooterDirective, BsModalCloseDirective, BsSelect2Component, BsItemTemplateDirective, BsButtonTypeDirective, FocusOnLoadDirective, BsFontColorPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalComponent {
  private tagService = inject(TagService);
  gitRepo = inject(GIT_REPO);

  isOpen = false;
  colors = Color;
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
