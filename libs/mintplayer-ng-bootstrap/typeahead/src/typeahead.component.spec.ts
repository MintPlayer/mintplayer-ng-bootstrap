import { vi } from 'vitest';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BsLiveAnnouncerService } from '@mintplayer/ng-bootstrap/a11y';
import { BsDropdownDirective, BsDropdownMenuDirective, BsDropdownToggleDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsFormComponent, BsFormGroupDirective, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { ClickOutsideDirective } from '@mintplayer/ng-click-outside';
import { MockComponent, MockDirective } from 'ng-mocks';
import { BsTypeaheadComponent } from './typeahead.component';
describe('TypeaheadComponent', () => {
  let component: BsTypeaheadComponent;
  let fixture: ComponentFixture<BsTypeaheadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        // Unit to test
        BsTypeaheadComponent,

        FormsModule,
        MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
        MockDirective(BsDropdownDirective), MockDirective(BsDropdownMenuDirective), MockDirective(BsDropdownToggleDirective),
        MockComponent(BsHasOverlayComponent),
        MockDirective(ClickOutsideDirective),
      ],
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BsTypeaheadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

@Component({
  selector: 'bs-typeahead-announce-harness',
  imports: [
    BsTypeaheadComponent,
    MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
    MockDirective(BsDropdownDirective), MockDirective(BsDropdownMenuDirective), MockDirective(BsDropdownToggleDirective),
    MockComponent(BsHasOverlayComponent),
    MockDirective(ClickOutsideDirective),
  ],
  template: `
    <bs-typeahead
      [suggestions]="suggestions()"
      (provideSuggestions)="lastQuery.set($event)"
    ></bs-typeahead>
  `,
})
class AnnounceHarnessComponent {
  suggestions = signal<{ text: string }[]>([]);
  lastQuery = signal<string>('');
}

describe('BsTypeaheadComponent — live-announcer integration', () => {
  let fixture: ComponentFixture<AnnounceHarnessComponent>;
  let host: AnnounceHarnessComponent;
  let typeahead: BsTypeaheadComponent;
  let announceSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnounceHarnessComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnnounceHarnessComponent);
    host = fixture.componentInstance;
    announceSpy = vi.spyOn(TestBed.inject(BsLiveAnnouncerService), 'announce');
    fixture.detectChanges();
    typeahead = fixture.debugElement.children[0].componentInstance;
  });

  it('does not announce on initial render', () => {
    expect(announceSpy).not.toHaveBeenCalled();
  });

  it('announces "N results found" after a search resolves', () => {
    typeahead.onProvideSuggestions('a');
    fixture.detectChanges();
    expect(announceSpy).not.toHaveBeenCalled();

    host.suggestions.set([{ text: 'apple' }, { text: 'apricot' }, { text: 'avocado' }]);
    fixture.detectChanges();

    expect(announceSpy).toHaveBeenCalledWith('3 results found');
  });

  it('announces "1 result found" for a singleton', () => {
    typeahead.onProvideSuggestions('app');
    fixture.detectChanges();

    host.suggestions.set([{ text: 'apple' }]);
    fixture.detectChanges();

    expect(announceSpy).toHaveBeenCalledWith('1 result found');
  });

  it('announces noSuggestionsText when results are empty', () => {
    typeahead.onProvideSuggestions('xyz');
    fixture.detectChanges();

    host.suggestions.set([]);
    fixture.detectChanges();

    expect(announceSpy).toHaveBeenCalledWith('No suggestions found');
  });

  it('does not announce when suggestions arrive without a pending request (e.g. parent prepopulated)', () => {
    host.suggestions.set([{ text: 'eager' }]);
    fixture.detectChanges();
    expect(announceSpy).not.toHaveBeenCalled();
  });

  it('does not announce when the searchterm is cleared', () => {
    typeahead.onProvideSuggestions('a');
    fixture.detectChanges();
    typeahead.onProvideSuggestions('');
    fixture.detectChanges();

    host.suggestions.set([]);
    fixture.detectChanges();
    expect(announceSpy).not.toHaveBeenCalled();
  });
});
