import { Component, Inject, TemplateRef } from '@angular/core';
import { BsModalContentComponent, BsModalService } from '@mintplayer/ng-bootstrap';
import { Tag } from '../../../entities/tag';
import { TagService } from '../../../services/tag/tag.service';

@Component({
  selector: 'demo-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent {
  constructor(private modalService: BsModalService, private tagService: TagService, @Inject('GIT_REPO') gitRepo: string) {
    this.gitRepo = gitRepo;
  }

  gitRepo: string;
  modal: BsModalContentComponent | null = null;
  tagSuggestions: Tag[] = [];
  selectedTags: Tag[] = [];

  showModal(template: TemplateRef<any>) {
    this.modal = this.modalService.show(template);
  }
  hideModal(modal: BsModalContentComponent) {
    if (modal) {
      this.modalService.hide(modal);
    }
  }
  
  onProvideTagSuggestions(search: string) {
    this.tagService.suggestTags(search, true).then((tags) => {
      if (tags) {
        this.tagSuggestions = tags;
      }
    });
  }
}
