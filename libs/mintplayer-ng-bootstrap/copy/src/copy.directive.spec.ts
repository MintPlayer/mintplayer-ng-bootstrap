import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsLiveAnnouncerService } from '@mintplayer/ng-bootstrap/a11y';
import { BsCopyDirective } from './copy.directive';

@Component({
  selector: 'bs-copy-test',
  imports: [BsCopyDirective],
  template: `<button type="button" [bsCopy]="value()" [copiedAnnouncement]="message()" (bsCopied)="copied.push($event)">Copy</button>`,
})
class BsCopyTestComponent {
  readonly value = signal<string | null>('Hello world');
  readonly message = signal('Copied to clipboard.');
  readonly copied: string[] = [];
}

describe('BsCopyDirective', () => {
  let fixture: ComponentFixture<BsCopyTestComponent>;
  let announce: ReturnType<typeof vi.fn>;
  let clipboard: Record<string, string>;
  let withClipboardData: boolean;

  beforeEach(() => {
    announce = vi.fn().mockResolvedValue(undefined);
    clipboard = {};
    withClipboardData = true;
    // execCommand('copy') fires a copy event the directive fills in; jsdom implements neither
    (document as unknown as { execCommand: unknown }).execCommand = vi.fn(() => {
      const ev = Object.assign(new Event('copy', { cancelable: true }), {
        clipboardData: withClipboardData ? { setData: (type: string, text: string) => (clipboard[type] = text) } : null,
      });
      document.dispatchEvent(ev);
      return true;
    });
    TestBed.configureTestingModule({ providers: [{ provide: BsLiveAnnouncerService, useValue: { announce } }] });
    fixture = TestBed.createComponent(BsCopyTestComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    delete (document as unknown as { execCommand?: unknown }).execCommand;
  });

  const click = () => (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

  it('puts the value on the clipboard, reports it and announces the copy', () => {
    click();
    expect(clipboard['text']).toBe('Hello world');
    expect(fixture.componentInstance.copied).toEqual(['Hello world']);
    expect(announce).toHaveBeenCalledWith('Copied to clipboard.');
  });

  it('announces in the consumer\'s language', () => {
    fixture.componentInstance.message.set('Gekopieerd.');
    fixture.detectChanges();
    click();
    expect(announce).toHaveBeenCalledWith('Gekopieerd.');
  });

  it('copies nothing without a value', () => {
    fixture.componentInstance.value.set(null);
    fixture.detectChanges();
    click();
    expect(clipboard).toEqual({});
    expect(fixture.componentInstance.copied).toEqual([]);
    expect(announce).not.toHaveBeenCalled();
  });

  it('copies nothing when the copy event offers no clipboard', () => {
    withClipboardData = false;
    click();
    expect(fixture.componentInstance.copied).toEqual([]);
  });

  it('stops listening for copy events once its own copy is done', () => {
    click();
    document.dispatchEvent(Object.assign(new Event('copy'), { clipboardData: { setData: () => undefined } }));
    expect(fixture.componentInstance.copied).toEqual(['Hello world']);
  });
});
