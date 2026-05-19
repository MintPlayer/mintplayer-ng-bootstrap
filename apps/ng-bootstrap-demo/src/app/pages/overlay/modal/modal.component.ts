import { Component, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { Color } from '@mintplayer/ng-bootstrap';
import { Tag } from '../../../entities/tag';
import { TagService } from '../../../services/tag/tag.service';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsColFormLabelDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsModalHostComponent, BsModalDirective, BsModalHeaderDirective, BsModalBodyDirective, BsModalFooterDirective, BsModalCloseDirective } from '@mintplayer/ng-bootstrap/modal';
import { BsSelect2Component, BsItemTemplateDirective } from '@mintplayer/ng-bootstrap/select2';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { BsFontColorPipe } from '@mintplayer/ng-bootstrap/font-color';
import { GIT_REPO } from '../../../providers/git-repo.provider';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-modal',
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss'],
  imports: [BsCodeSnippetComponent, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsGridColDirective, BsColFormLabelDirective, BsModalHostComponent, BsModalDirective, BsModalHeaderDirective, BsModalBodyDirective, BsModalFooterDirective, BsModalCloseDirective, BsSelect2Component, BsItemTemplateDirective, BsButtonTypeDirective, FocusOnLoadDirective, BsFontColorPipe],
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

  protected readonly snippetBasicHtml = dedent`
    <button [color]="colors.primary" (click)="isOpen = true">Open modal</button>

    <bs-modal [(isOpen)]="isOpen">
      <div *bsModal>
        <div bsModalHeader>
          <h5 class="modal-title">Modal title</h5>
        </div>
        <div bsModalBody>
          Place any content here — forms, lists, embedded components.
        </div>
        <div bsModalFooter>
          <button type="button" bsModalClose [color]="colors.secondary">Close</button>
        </div>
      </div>
    </bs-modal>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { Color } from '@mintplayer/ng-bootstrap';
    import {
      BsModalHostComponent,
      BsModalDirective,
      BsModalHeaderDirective,
      BsModalBodyDirective,
      BsModalFooterDirective,
      BsModalCloseDirective,
    } from '@mintplayer/ng-bootstrap/modal';
    import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';

    @Component({
      selector: 'my-modal-demo',
      templateUrl: './my-modal-demo.component.html',
      imports: [
        BsModalHostComponent,
        BsModalDirective,
        BsModalHeaderDirective,
        BsModalBodyDirective,
        BsModalFooterDirective,
        BsModalCloseDirective,
        BsButtonTypeDirective,
      ],
    })
    export class MyModalDemoComponent {
      protected readonly colors = Color;
      protected isOpen = false;
    }
  `;
}
