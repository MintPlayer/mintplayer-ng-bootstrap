import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BsShellSidebarDirective, BsShellTopbarDirective } from '../shell-sidebar/shell-sidebar.directive';
import { BsShellState, BsShellStateChange } from '../shell-state';
import { BsShellComponent } from './shell.component';

@Component({
  imports: [BsShellComponent, BsShellSidebarDirective, BsShellTopbarDirective],
  template: `
    <bs-shell [state]="state()" [externalToggle]="external()" (statechange)="changes.push($event)">
      <span *bsShellTopbar class="brand">Brand</span>
      <nav *bsShellSidebar class="links">Links</nav>
      <main class="page">Content</main>
    </bs-shell>
  `,
})
class HostComponent {
  readonly state = signal<BsShellState>('auto');
  readonly external = signal(false);
  readonly changes: BsShellStateChange[] = [];
}

describe('BsShellComponent', () => {
  const setup = () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const shell = fixture.nativeElement.querySelector('bs-shell') as HTMLElement;
    const check = (mode: 'narrow' | 'wide') => shell.querySelector<HTMLInputElement>(`input.shell-toggle-${mode}`)!;
    return { fixture, shell, check };
  };

  it('renders the shell markup on its own host', () => {
    const { shell } = setup();
    expect(shell.matches('.shell[data-mps=shell][data-breakpoint=md]')).toBe(true);
    expect(shell.querySelector('.topbar .brand')?.textContent).toBe('Brand');
    expect(shell.querySelector('aside.sidebar .links')?.textContent).toBe('Links');
    expect(shell.querySelector('.content .page')?.textContent).toBe('Content');
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

  it('lowers externalToggle onto a bare data attribute', () => {
    const { fixture, shell } = setup();
    expect(shell.hasAttribute('data-external-toggle')).toBe(false);
    fixture.componentInstance.external.set(true);
    fixture.detectChanges();
    expect(shell.getAttribute('data-external-toggle')).toBe('');
  });
});
