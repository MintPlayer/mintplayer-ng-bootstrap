import { Component, DestroyRef, inject, model, signal, ChangeDetectionStrategy } from '@angular/core';
import { Artist } from '../../../entities/artist';
import { SubjectService } from '../../../services/subject/subject.service';
import { ESubjectType } from '../../../enums/subject-type';
import { delay } from 'rxjs';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsFormComponent } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsSearchboxComponent, BsEnterSearchTermTemplateDirective, BsSuggestionTemplateDirective } from '@mintplayer/ng-bootstrap/searchbox';
import { JsonPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-searchbox',
  templateUrl: './searchbox.component.html',
  styleUrls: ['./searchbox.component.scss'],
  imports: [JsonPipe, BsCodeSnippetComponent, BsFormComponent, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsSearchboxComponent, BsEnterSearchTermTemplateDirective, BsSuggestionTemplateDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchboxComponent {

  subjectService = inject(SubjectService);
  destroy = inject(DestroyRef);

  suggestions = signal<Artist[]>([]);
  selectedArtist = model<Artist | undefined>(undefined);

  onProvideSuggestions(searchterm: string) {
    this.subjectService.suggest(searchterm, [ESubjectType.artist], false)
      .pipe(delay(2000), takeUntilDestroyed(this.destroy))
      .subscribe(artists => this.suggestions.set(artists.map(s => <Artist>s)));
  }

  protected readonly snippetBasicHtml = dedent`
    <bs-searchbox (provideSuggestions)="onProvideSuggestions($event)"
                  [(selectedItem)]="selectedArtist">
      Search for artists
      <div *bsEnterSearchTermTemplate>Start typing...</div>
      <div *bsSuggestionTemplate="let suggestion of suggestions()">
        {{ suggestion.name }}
      </div>
    </bs-searchbox>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, model, signal } from '@angular/core';
    import { BsSearchboxComponent, BsEnterSearchTermTemplateDirective, BsSuggestionTemplateDirective } from '@mintplayer/ng-bootstrap/searchbox';
    interface Artist { id: number; name: string; }

    @Component({
      selector: 'my-searchbox-demo',
      templateUrl: './my-searchbox-demo.component.html',
      imports: [
        BsSearchboxComponent,
        BsEnterSearchTermTemplateDirective,
        BsSuggestionTemplateDirective,
      ],
    })
    export class MySearchboxDemoComponent {
      protected readonly suggestions = signal<Artist[]>([]);
      protected readonly selectedArtist = model<Artist | undefined>(undefined);

      onProvideSuggestions(term: string) {
        // call your service, then this.suggestions.set(results)
      }
    }
  `;

}