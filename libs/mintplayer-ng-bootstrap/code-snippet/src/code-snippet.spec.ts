import { describe, expect, it } from 'vitest';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BsCodeSnippetComponent, type CodeLineActivation } from './index';

/**
 * The generated `bs-code-snippet` (#437): the listing renders in the
 * component's own template, highlighting follows the first render, and the
 * outputs carry the core's payloads.
 */

// Inputs are driven from signals: a plain-field write on the host notifies
// nothing, so detectChanges() would not re-evaluate the binding.
@Component({
  imports: [BsCodeSnippetComponent],
  template: `<bs-code-snippet #snippet [code]="code()" [language]="'typescript'" [lineNumbers]="true" [lineHref]="lineHref"
    [activeLine]="active()" (languagedetected)="detected.push($event)" (lineactivate)="onLine($event)" />`,
})
class HostComponent {
  readonly code = signal('const a = 1;\nconst b = 2;');
  readonly active = signal<number | null>(null);
  readonly detected: string[] = [];
  readonly lineHref = (line: number) => `#L${line}`;
  onLine(event: CodeLineActivation): void {
    event.preventDefault();
    this.active.set(event.line);
  }
}

async function create(): Promise<ComponentFixture<HostComponent>> {
  const f = TestBed.createComponent(HostComponent);
  f.detectChanges();
  await f.whenStable();
  const snippet = f.debugElement.children[0].componentInstance as BsCodeSnippetComponent;
  await snippet.whenHighlighted();
  f.detectChanges();
  await f.whenStable();
  return f;
}

describe('bs-code-snippet', () => {
  it('renders highlighted rows on its own host and reports the language', async () => {
    const f = await create();
    const host = f.nativeElement.querySelector('bs-code-snippet') as HTMLElement;
    expect(host.classList.contains('code-snippet')).toBe(true);
    expect(host.querySelectorAll('.line')).toHaveLength(2);
    expect(host.querySelector('.line-text .hljs-keyword')?.textContent).toBe('const');
    expect(host.querySelector('button.copy')?.hasAttribute('disabled')).toBe(false);
    expect(f.componentInstance.detected).toEqual(['typescript']);
  });

  it('lets the consumer take over a line link with preventDefault()', async () => {
    const f = await create();
    const link = f.nativeElement.querySelectorAll('a.line-number')[1] as HTMLAnchorElement;
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(click);
    f.detectChanges();
    expect(click.defaultPrevented).toBe(true);
    expect(f.componentInstance.active()).toBe(2);
    expect(f.nativeElement.querySelectorAll('.line')[1].classList.contains('active')).toBe(true);
  });
});
