import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { CodeLineAnnotation, MpCodeSnippet } from '@mintplayer/web-components/code-snippet';
import { BsCodeSnippetComponent } from './code-snippet.component';

@Component({
  imports: [BsCodeSnippetComponent],
  template: `
    <bs-code-snippet aria-label="Example" role="region" id="snippet" tabindex="-1" data-keep="yes"
      [code]="code()" [language]="language()" [lineNumbers]="lineNumbers()" [startLine]="5" [wrap]="true"
      [theme]="'dark'" [activeLine]="7" [label]="label()" [copyLabel]="'Kopieer'" [lineLabel]="''"
      [annotations]="annotations" [lineHref]="lineHref"
      (detectedLanguage)="detected.push($event)" (lineActivate)="onLine($event)">
    </bs-code-snippet>`,
})
class HostComponent {
  readonly code = signal('const a = 1;');
  readonly language = signal('');
  readonly lineNumbers = signal(true);
  readonly label = signal('');
  readonly annotations: CodeLineAnnotation[] = [{ line: 1, kind: 'covered' } as CodeLineAnnotation];
  readonly lineHref = (line: number) => `#L${line}`;
  readonly detected: string[] = [];
  readonly lines: number[] = [];
  onLine(e: CustomEvent<{ line: number }>) {
    this.lines.push(e.detail.line);
    e.preventDefault();
  }
}

describe('BsCodeSnippetComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const el = () => fixture.nativeElement.querySelector('mp-code-snippet') as MpCodeSnippet & HTMLElement;
  const wrapper = () => fixture.nativeElement.querySelector('bs-code-snippet') as HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('passes code, annotations and lineHref as properties', () => {
    const host = fixture.componentInstance;
    expect(el().code).toBe('const a = 1;');
    expect(el().annotations).toBe(host.annotations);
    expect(el().lineHref).toBe(host.lineHref);
  });

  it('passes strings and flags as attributes, leaving unset ones absent so the element keeps its defaults', () => {
    const e = el();
    expect(e.hasAttribute('language')).toBe(false);
    expect(e.getAttribute('line-numbers')).toBe('');
    expect(e.getAttribute('start-line')).toBe('5');
    expect(e.getAttribute('wrap')).toBe('');
    expect(e.getAttribute('theme')).toBe('dark');
    expect(e.getAttribute('active-line')).toBe('7');
    expect(e.hasAttribute('label')).toBe(false);
    expect(e.getAttribute('copy-label')).toBe('Kopieer');
    expect(e.hasAttribute('line-label')).toBe(false);

    fixture.componentInstance.language.set('ts');
    fixture.componentInstance.label.set('Voorbeeld');
    fixture.componentInstance.lineNumbers.set(false);
    fixture.detectChanges();
    expect(e.getAttribute('language')).toBe('ts');
    expect(e.getAttribute('label')).toBe('Voorbeeld');
    expect(e.hasAttribute('line-numbers')).toBe(false);
  });

  it('moves ARIA, role, id and tabindex from the wrapper onto the element', () => {
    const e = el();
    expect(e.getAttribute('aria-label')).toBe('Example');
    expect(e.getAttribute('role')).toBe('region');
    expect(e.id).toBe('snippet');
    expect(e.getAttribute('tabindex')).toBe('-1');
    ['aria-label', 'role', 'id', 'tabindex'].map((name) => expect(wrapper().hasAttribute(name)).toBe(false));
    // anything else stays where the consumer put it
    expect(wrapper().getAttribute('data-keep')).toBe('yes');
  });

  it('re-emits the detected language', () => {
    el().dispatchEvent(new CustomEvent('language-detected', { detail: { language: 'typescript' } }));
    expect(fixture.componentInstance.detected).toEqual(['typescript']);
  });

  it('emits the line-activate event itself, so the consumer can prevent its navigation', () => {
    const ev = new CustomEvent('line-activate', { detail: { line: 3 }, cancelable: true });
    el().dispatchEvent(ev);
    expect(fixture.componentInstance.lines).toEqual([3]);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('scrollToLine delegates to the element', () => {
    const scroll = vi.spyOn(el(), 'scrollToLine').mockImplementation(() => undefined);
    const cmp = fixture.debugElement.query(By.directive(BsCodeSnippetComponent)).componentInstance as BsCodeSnippetComponent;
    cmp.scrollToLine(12);
    expect(scroll).toHaveBeenCalledWith(12);
  });
});
