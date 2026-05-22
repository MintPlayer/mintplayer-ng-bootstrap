import { Component, DestroyRef, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Artist } from '../../../entities/artist';
import { Tag } from '../../../entities/tag';
import { ESubjectType } from '../../../enums/subject-type';
import { SubjectService } from '../../../services/subject/subject.service';
import { TagService } from '../../../services/tag/tag.service';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsSelect2Component, BsItemTemplateDirective, BsSuggestionTemplateDirective } from '@mintplayer/ng-bootstrap/select2';
import { BsFontColorPipe } from '@mintplayer/ng-bootstrap/font-color';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-select2',
  templateUrl: './select2.component.html',
  styleUrls: ['./select2.component.scss'],
  imports: [BsCodeSnippetComponent, BsSelect2Component, BsItemTemplateDirective, BsSuggestionTemplateDirective, BsFontColorPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Select2Component {

  subjectService = inject(SubjectService);
  tagService = inject(TagService);
  destroy = inject(DestroyRef);

  artistSuggestions = signal<Artist[]>([]);
  tagSuggestions = signal<Tag[]>([]);
  selectedTags = signal<Tag[]>([]);

  onProvideArtistSuggestions(search: string) {
    this.subjectService.suggest(search, [ESubjectType.artist])
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(artists => this.artistSuggestions.set(artists.map(s => <Artist>s)));
  }
  onProvideTagSuggestions(search: string) {
    this.tagService.suggestTags(search, true).then((tags) => {
      if (tags) {
        this.tagSuggestions.set(tags);
      }
    });
  }

  protected readonly snippetBasicHtml = dedent`
    <bs-select2 (provideSuggestions)="onProvideArtistSuggestions($event)"
                [suggestions]="artistSuggestions()">
    </bs-select2>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, signal } from '@angular/core';
    import { BsSelect2Component } from '@mintplayer/ng-bootstrap/select2';
    interface Artist { id: number; name: string; }

    @Component({
      selector: 'my-select2-demo',
      templateUrl: './my-select2-demo.component.html',
      imports: [BsSelect2Component],
    })
    export class MySelect2DemoComponent {
      protected readonly artistSuggestions = signal<Artist[]>([]);

      onProvideArtistSuggestions(term: string) {
        // call your service, then this.artistSuggestions.set(results)
      }
    }
  `;

  protected readonly snippetCustomTemplateHtml = dedent`
    <!-- Project *bsItemTemplate / *bsSuggestionTemplate to customise the chip
         and dropdown rendering. The let-… exposes the row data. -->
    <bs-select2 (provideSuggestions)="onProvideTagSuggestions($event)">
      <span *bsItemTemplate="let item of selectedTags; let select2=select2"
            class="select2-item"
            [style.background]="item.category?.color">
        <span (click)="select2.onRemoveItem(item, $event)">×</span>
        {{ item.description }}
      </span>

      <span *bsSuggestionTemplate="let suggestion of tagSuggestions()"
            class="select2-item cursor-pointer"
            [style.background]="suggestion.category?.color">
        {{ suggestion.description }}
      </span>
    </bs-select2>
  `;
}
