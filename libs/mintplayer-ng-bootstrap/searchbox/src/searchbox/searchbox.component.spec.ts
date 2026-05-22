import { vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockComponent, MockDirective } from 'ng-mocks';
import { Component, signal } from '@angular/core';
import { BsLiveAnnouncerService } from '@mintplayer/ng-bootstrap/a11y';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsSearchboxComponent } from './searchbox.component';
import { BsDropdownDirective, BsDropdownMenuDirective, BsDropdownToggleDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsFormComponent, BsFormGroupDirective, BsFormControlDirective } from '@mintplayer/ng-bootstrap/form';
import { BsDropdownMenuComponent, BsDropdownItemComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';

interface Item {
  id: number;
}

@Component({
  selector: 'searchbox-test',
  template: `
    <bs-form>
      <bs-searchbox [suggestions]="suggestions"></bs-searchbox>
    </bs-form>`,
  imports: [
    MockComponent(BsFormComponent),
    BsSearchboxComponent,
  ],
})
class BsSearchboxTestComponent {
  suggestions: Item[] = [];
}

describe('BsSearchboxComponent', () => {
  let component: BsSearchboxTestComponent;
  let fixture: ComponentFixture<BsSearchboxTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MockComponent(BsFormComponent), MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
        MockDirective(BsDropdownDirective), MockDirective(BsDropdownMenuDirective), MockDirective(BsDropdownToggleDirective),
        MockDirective(BsButtonTypeDirective),
        MockComponent(BsDropdownMenuComponent), MockComponent(BsDropdownItemComponent),
        MockComponent(BsHasOverlayComponent),
        // Unit to test
        BsSearchboxComponent,

        // Testbench
        BsSearchboxTestComponent,
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(BsSearchboxTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

@Component({
  selector: 'searchbox-announce-harness',
  template: `
    <bs-form>
      <bs-searchbox
        [(suggestions)]="suggestions"
        (provideSuggestions)="lastQuery.set($event)"
      ></bs-searchbox>
    </bs-form>`,
  imports: [
    MockComponent(BsFormComponent),
    MockDirective(BsFormGroupDirective), MockDirective(BsFormControlDirective),
    MockDirective(BsDropdownDirective), MockDirective(BsDropdownMenuDirective), MockDirective(BsDropdownToggleDirective),
    MockDirective(BsButtonTypeDirective),
    MockComponent(BsDropdownMenuComponent), MockComponent(BsDropdownItemComponent),
    MockComponent(BsHasOverlayComponent),
    BsSearchboxComponent,
  ],
})
class AnnounceHarnessComponent {
  suggestions = signal<Item[]>([]);
  lastQuery = signal<string>('');
}

describe('BsSearchboxComponent — live-announcer integration', () => {
  let fixture: ComponentFixture<AnnounceHarnessComponent>;
  let host: AnnounceHarnessComponent;
  let searchbox: BsSearchboxComponent<Item, number>;
  let announceSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [AnnounceHarnessComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnnounceHarnessComponent);
    host = fixture.componentInstance;
    announceSpy = vi.spyOn(TestBed.inject(BsLiveAnnouncerService), 'announce');
    fixture.detectChanges();
    const searchboxDe = fixture.debugElement.query(
      (de) => de.componentInstance instanceof BsSearchboxComponent,
    );
    searchbox = searchboxDe.componentInstance;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not announce on initial render', () => {
    expect(announceSpy).not.toHaveBeenCalled();
  });

  it('announces "N results found" after the debounced search resolves', () => {
    searchbox.searchterm.set('app');
    fixture.detectChanges();
    vi.advanceTimersByTime(200); // debounce
    expect(announceSpy).not.toHaveBeenCalled();

    host.suggestions.set([{ id: 1 }, { id: 2 }, { id: 3 }]);
    fixture.detectChanges();

    expect(announceSpy).toHaveBeenCalledWith('3 results found');
  });

  it('announces "1 result found" for a singleton', () => {
    searchbox.searchterm.set('apple');
    fixture.detectChanges();
    vi.advanceTimersByTime(200);

    host.suggestions.set([{ id: 1 }]);
    fixture.detectChanges();

    expect(announceSpy).toHaveBeenCalledWith('1 result found');
  });

  it('announces noResultsAnnouncement when results are empty', () => {
    searchbox.searchterm.set('xyz');
    fixture.detectChanges();
    vi.advanceTimersByTime(200);

    host.suggestions.set([]);
    fixture.detectChanges();

    expect(announceSpy).toHaveBeenCalledWith('No results found');
  });

  it('does not announce when suggestions arrive without an in-flight request', () => {
    host.suggestions.set([{ id: 1 }]);
    fixture.detectChanges();
    expect(announceSpy).not.toHaveBeenCalled();
  });

  it('does not announce when searchterm is cleared before results arrive', () => {
    searchbox.searchterm.set('a');
    fixture.detectChanges();
    vi.advanceTimersByTime(200);

    searchbox.searchterm.set('');
    fixture.detectChanges();
    vi.advanceTimersByTime(200);

    host.suggestions.set([]);
    fixture.detectChanges();

    expect(announceSpy).not.toHaveBeenCalled();
  });
});
