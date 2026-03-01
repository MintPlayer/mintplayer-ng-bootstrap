import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, input, signal, TemplateRef, viewChild } from '@angular/core';
import { BsShellState } from '../shell-state';
import { Breakpoint } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsShellComponent {

  sidebarTemplate = signal<TemplateRef<any> | null>(null);
  readonly rootElement = viewChild.required<ElementRef<HTMLDivElement>>('root');

  state = input<BsShellState>('auto');
  breakpoint = input<Breakpoint>('md');

  stateClass = computed(() => {
    const state = this.state();
    if (state === 'auto') return null;
    else return state;
  });

  breakpointClass = computed(() => `shell-${this.breakpoint()}`);

  public setSize(size: string) {
    this.rootElement().nativeElement.style.setProperty('--size', size);
  }
}
