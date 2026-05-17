import { Component, DestroyRef, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { BsSelect2Component } from '@mintplayer/ng-bootstrap/select2';
import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';
import { Artist } from '../../../entities/artist';
import { Tag } from '../../../entities/tag';
import { ESubjectType } from '../../../enums/subject-type';
import { SubjectService } from '../../../services/subject/subject.service';
import { TagService } from '../../../services/tag/tag.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { dedent } from 'ts-dedent';

@Component({
  selector: 'demo-autofocus',
  templateUrl: './autofocus.component.html',
  styleUrls: ['./autofocus.component.scss'],
  imports: [BsCodeSnippetComponent, BsSelect2Component, FocusOnLoadDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutofocusComponent {

  subjectService = inject(SubjectService);
  tagService = inject(TagService);
  destroy = inject(DestroyRef);

  artistSuggestions = signal<Artist[]>([]);
  tagSuggestions = signal<Tag[]>([]);
  selectedTags: Tag[] = [];

  onProvideArtistSuggestions(search: string) {
    this.subjectService.suggest(search, [ESubjectType.artist])
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe(artists => this.artistSuggestions.set(<Artist[]>artists.map(s => <Artist>s)));
  }
  onProvideTagSuggestions(search: string) {
    this.tagService.suggestTags(search, true).then((tags) => {
      if (tags) {
        this.tagSuggestions.set(tags);
      }
    });
  }

  protected readonly snippetBasicHtml = dedent`
    <input type="text" name="name" autofocus>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component } from '@angular/core';
    import { FocusOnLoadDirective } from '@mintplayer/ng-focus-on-load';

    @Component({
      selector: 'my-autofocus-demo',
      templateUrl: './my-autofocus-demo.component.html',
      imports: [FocusOnLoadDirective],
    })
    export class MyAutofocusDemoComponent {}
  `;

}
