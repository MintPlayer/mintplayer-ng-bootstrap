import { Component, DestroyRef, inject, signal, ChangeDetectionStrategy} from '@angular/core';
import { Artist } from '../../../entities/artist';
import { SubjectService } from '../../../services/subject/subject.service';
import { ESubjectType } from '../../../enums/subject-type';
import { delay } from 'rxjs';
import { BsFormComponent, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsSearchboxComponent, BsEnterSearchTermTemplateDirective, BsSuggestionTemplateDirective } from '@mintplayer/ng-bootstrap/searchbox';
import { JsonPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'demo-searchbox',
  templateUrl: './searchbox.component.html',
  styleUrls: ['./searchbox.component.scss'],
  imports: [JsonPipe, BsFormComponent, BsFormControlDirective, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsSearchboxComponent, BsEnterSearchTermTemplateDirective, BsSuggestionTemplateDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchboxComponent {

  subjectService = inject(SubjectService);
  destroy = inject(DestroyRef);

  suggestions = signal<Artist[]>([]);
  selectedArtist = signal<Artist | undefined>(undefined);

  onProvideSuggestions(searchterm: string) {
    this.subjectService.suggest(searchterm, [ESubjectType.artist], false)
      .pipe(delay(2000), takeUntilDestroyed(this.destroy))
      .subscribe(artists => this.suggestions.set(artists.map(s => <Artist>s)));
  }

}