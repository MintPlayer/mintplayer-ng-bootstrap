import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Observable, Subject } from 'rxjs';
import type { TypeaheadSource } from '@mintplayer/ui-core/typeahead';
import { BsTypeaheadComponent, BsTypeaheadItemDirective } from './generated';
import { BsTypeaheadValueAccessor } from './typeahead.accessor';

interface Item {
  text: string;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const flush = async (fixture: ComponentFixture<unknown>) => {
  await new Promise((r) => setTimeout(r, 0));
  await fixture.whenStable();
};

@Component({
  selector: 'bs-typeahead-harness',
  imports: [BsTypeaheadComponent, BsTypeaheadItemDirective, FormsModule],
  template: `
    <bs-typeahead
      [provider]="provider()"
      [debounceMs]="debounceMs()"
      [minLength]="minLength()"
      [disabled]="disabled()"
      [(ngModel)]="value"
      (itemselect)="selected.push($event.item)"
      (termsubmit)="submitted.push($event)"
    >
      @if (withTemplate()) {
        <ng-container *bsTypeaheadItem="let item = item; let term = term">
          <b>{{ item.text }}</b> for <i>{{ term }}</i>
        </ng-container>
      }
    </bs-typeahead>
  `,
})
class HarnessComponent {
  readonly provider = signal<TypeaheadSource<Item> | null>(null);
  readonly debounceMs = signal(0);
  readonly minLength = signal(1);
  readonly disabled = signal(false);
  readonly withTemplate = signal(false);
  readonly value = signal('');
  selected: Item[] = [];
  submitted: string[] = [];
}

describe('BsTypeaheadComponent (generated front)', () => {
  let fixture: ComponentFixture<HarnessComponent>;
  let host: HarnessComponent;
  let calls: { term: string; signal: AbortSignal }[];
  let answers: ReturnType<typeof deferred<Item[]>>[];

  const accessor = () => fixture.debugElement.children[0].injector.get(BsTypeaheadValueAccessor);
  const input = () => fixture.nativeElement.querySelector('input') as HTMLInputElement;
  const options = () => Array.from(fixture.nativeElement.querySelectorAll('li[role=option]')) as HTMLElement[];

  function type(term: string) {
    input().value = term;
    input().dispatchEvent(new Event('input', { bubbles: true }));
  }

  beforeEach(async () => {
    vi.useRealTimers();
    await TestBed.configureTestingModule({ imports: [HarnessComponent] }).compileComponents();
    fixture = TestBed.createComponent(HarnessComponent);
    host = fixture.componentInstance;
    calls = [];
    answers = [];
    host.provider.set((term, { signal }) => {
      calls.push({ term, signal });
      const d = deferred<Item[]>();
      answers.push(d);
      return d.promise;
    });
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('requests only the settled term when debounced', async () => {
    vi.useFakeTimers();
    host.debounceMs.set(200);
    fixture.detectChanges();
    type('k');
    vi.advanceTimersByTime(100);
    type('kru');
    vi.advanceTimersByTime(199);
    expect(calls).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(calls.map((c) => c.term)).toEqual(['kru']);
    vi.useRealTimers();
  });

  it('aborts a superseded request and ignores its late answer', async () => {
    type('kru');
    type('kruish');
    expect(calls[0].signal.aborted).toBe(true);
    expect(calls[1].signal.aborted).toBe(false);
    answers[1].resolve([{ text: 'Kruishoutem' }]);
    answers[0].resolve([{ text: 'stale' }]);
    await flush(fixture);
    expect(options().map((o) => o.textContent?.trim())).toEqual(['Kruishoutem']);
  });

  it('unsubscribes an Observable provider when its request is aborted', async () => {
    const subject = new Subject<Item[]>();
    let unsubscribed = 0;
    const observable = new Observable<Item[]>((subscriber) => {
      const sub = subject.subscribe(subscriber);
      return () => {
        unsubscribed += 1;
        sub.unsubscribe();
      };
    });
    host.provider.set(() => observable);
    fixture.detectChanges();
    type('kru');
    type('kruish');
    expect(unsubscribed).toBe(1);
    subject.next([{ text: 'Kruishoutem' }]);
    await flush(fixture);
    expect(options().map((o) => o.textContent?.trim())).toEqual(['Kruishoutem']);
  });

  it('renders the item template with the term in its context and re-renders it on a new term', async () => {
    host.withTemplate.set(true);
    fixture.detectChanges();
    type('kru');
    answers[0].resolve([{ text: 'Kruishoutem' }]);
    await flush(fixture);
    expect(options()[0].innerHTML).toContain('<b>Kruishoutem</b>');
    expect(options()[0].querySelector('i')!.textContent).toBe('kru');
    type('krui');
    answers[1].resolve([{ text: 'Kruishoutem' }]);
    await flush(fixture);
    expect(options()[0].querySelector('i')!.textContent).toBe('krui');
  });

  it('is a form control whose value is the text, free text included; a pick writes the item text', async () => {
    type('Nieuwe straat');
    await fixture.whenStable();
    expect(host.value()).toBe('Nieuwe straat');
    answers[0].resolve([{ text: 'Kerkstraat' }]);
    await flush(fixture);
    options()[0].click();
    await fixture.whenStable();
    expect(host.value()).toBe('Kerkstraat');
    expect(host.selected).toEqual([{ text: 'Kerkstraat' }]);

    accessor().writeValue('Molenstraat');
    await fixture.whenStable();
    expect(input().value).toBe('Molenstraat');
    expect(calls).toHaveLength(1); // writeValue never queries

    accessor().setDisabledState(true);
    await fixture.whenStable();
    expect(input().disabled).toBe(true);
  });

  it('marks the control touched on focusout and submits on Enter when the list is closed', async () => {
    const touched = vi.fn();
    accessor().registerOnTouched(touched);
    type('kru');
    input().dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(touched).toHaveBeenCalled();
    input().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(host.submitted).toEqual(['kru']);
  });
});
