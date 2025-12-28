import { Component, inject, signal } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { BsSelect2Module } from '@mintplayer/ng-bootstrap/select2';
import { BsFontColorPipe } from '@mintplayer/ng-bootstrap/font-color';
import { Tag } from '../../../entities/tag';
import { TagService } from '../../../services/tag/tag.service';

@Component({
  selector: 'demo-select2-drag-drop',
  templateUrl: './select2-drag-drop.component.html',
  styleUrls: ['./select2-drag-drop.component.scss'],
  standalone: true,
  imports: [BsSelect2Module, BsFontColorPipe, DragDropModule]
})
export class Select2DragDropComponent {

  tagService = inject(TagService);

  tagSuggestions = signal<Tag[]>([]);
  selectedTags = signal<Tag[]>([]);

  onProvideTagSuggestions(search: string) {
    this.tagService.suggestTags(search, true).then((tags) => {
      if (tags) {
        this.tagSuggestions.set(tags);
      }
    });
  }

  onTagDropped(event: CdkDragDrop<Tag[]>) {
    const tags = [...this.selectedTags()];
    moveItemInArray(tags, event.previousIndex, event.currentIndex);
    this.selectedTags.set(tags);
  }

}
