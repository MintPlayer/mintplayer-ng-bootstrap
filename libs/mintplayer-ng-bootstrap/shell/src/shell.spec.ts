import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import type { ShellState, ShellStateChange } from '@mintplayer/ui-core/shell';
import { BsShellComponent, BsShellSidebarDirective, BsShellTopbarDirective } from '../index';

@Component({
  imports: [BsShellComponent, BsShellSidebarDirective, BsShellTopbarDirective],
  template: `
    <bs-shell #shell [state]="state()" [externalToggle]="external()" [size]="size()" (statechange)="changes.push($event)">
      <span *bsShellTopbar class="brand">Brand</span>
      <nav *bsShellSidebar class="links">Links</nav>
      <main class="page">Content</main>
    </bs-shell>
  `,
})
class HostComponent {
  readonly state = signal<ShellState>('auto');
  readonly external = signal(false);
  readonly size = signal<string | null>(null);
  readonly changes: ShellStateChange[] = [];
}

describe('bs-shell (generated, #458)', () => {
  const setup = () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const shell = fixture.nativeElement.querySelector('bs-shell') as HTMLElement;
    const check = (mode: 'narrow' | 'wide') => shell.querySelector<HTMLInputElement>(`input.shell-toggle-${mode}`)!;
    return { fixture, shell, check };
  };

  it('renders the shell markup on its own host, with the slots in their regions', () => {
    const { shell } = setup();
    expect(shell.matches('.shell[data-mps=shell][data-breakpoint=md]')).toBe(true);
    expect(shell.querySelector('.topbar .brand')?.textContent).toBe('Brand');
    expect(shell.querySelector('aside.sidebar .links')?.textContent).toBe('Links');
    expect(shell.querySelector('.content .page')?.textContent).toBe('Content');
    expect(shell.querySelector('a.skip-link')?.getAttribute('href')).toMatch(/^#.+-content$/);
  });

  it('starts from the state: auto reveals only in wide mode', () => {
    const { check } = setup();
    expect(check('narrow').checked).toBe(false);
    expect(check('wide').checked).toBe(true);
  });

  it('applies a later state change to both checkboxes', async () => {
    const { fixture, check } = setup();
    fixture.componentInstance.state.set('hide');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(check('narrow').checked).toBe(false);
    expect(check('wide').checked).toBe(false);
  });

  it('emits statechange as { open } when a toggle flips', () => {
    const { fixture, check } = setup();
    check('wide').click();
    expect(fixture.componentInstance.changes).toEqual([{ open: false }]);
  });

  it('lowers externalToggle onto a bare data attribute and size onto the sidebar root', () => {
    const { fixture, shell } = setup();
    expect(shell.hasAttribute('data-external-toggle')).toBe(false);
    fixture.componentInstance.external.set(true);
    fixture.componentInstance.size.set('20rem');
    fixture.detectChanges();
    expect(shell.getAttribute('data-external-toggle')).toBe('');
    expect(shell.querySelector<HTMLElement>('.sidebar-root')!.style.getPropertyValue('--mp-shell-size')).toBe('20rem');
  });
});
