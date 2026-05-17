import { Component, inject, model, signal, ChangeDetectionStrategy} from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsSelect2Component, BsItemTemplateDirective, BsSuggestionTemplateDirective } from '@mintplayer/ng-bootstrap/select2';
import { BsFontColorPipe } from '@mintplayer/ng-bootstrap/font-color';
import { Tag } from '../../../entities/tag';
import { TagService } from '../../../services/tag/tag.service';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-select2-drag-drop',
  templateUrl: './select2-drag-drop.component.html',
  styleUrls: ['./select2-drag-drop.component.scss'],
  imports: [BsSelect2Component, BsItemTemplateDirective, BsSuggestionTemplateDirective, BsCodeSnippetComponent, BsFontColorPipe, DragDropModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Select2DragDropComponent {

  tagService = inject(TagService);

  tagSuggestions = signal<Tag[]>([]);
  selectedTags = model<Tag[]>([]);

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

  protected readonly snippetBasicHtml = dedent`
    <bs-select2 cdkDropList cdkDropListOrientation="mixed"
        (cdkDropListDropped)="onDrop($event)"
        (provideSuggestions)="onProvideSuggestions($event)"
        [suggestions]="suggestions()"
        [(selectedItems)]="selected">
      <span *bsItemTemplate="let item of selected(); let select2=select2" cdkDrag class="select2-item">
        <span class="drag-handle">&#9776;</span>
        <span (click)="select2.onRemoveItem(item,$event)">&times;</span>
        {{ item.description }}
      </span>
      <span *bsSuggestionTemplate="let suggestion of suggestions()" class="select2-item">
        {{ suggestion.description }}
      </span>
    </bs-select2>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, model, signal } from '@angular/core';
    import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
    import {
      BsSelect2Component,
      BsItemTemplateDirective,
      BsSuggestionTemplateDirective,
    } from '@mintplayer/ng-bootstrap/select2';

    interface Tag { id: number; description: string; }

    @Component({
      selector: 'my-select2-drag-drop-demo',
      templateUrl: './my-select2-drag-drop-demo.component.html',
      imports: [
        DragDropModule,
        BsSelect2Component,
        BsItemTemplateDirective,
        BsSuggestionTemplateDirective,
      ],
    })
    export class MySelect2DragDropDemoComponent {
      protected suggestions = signal<Tag[]>([]);
      protected selected = model<Tag[]>([]);

      onProvideSuggestions(search: string) {
        // load suggestions...
      }

      onDrop(event: CdkDragDrop<Tag[]>) {
        const tags = [...this.selected()];
        moveItemInArray(tags, event.previousIndex, event.currentIndex);
        this.selected.set(tags);
      }
    }
  `;
}
