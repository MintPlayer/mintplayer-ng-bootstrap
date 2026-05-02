import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, input, signal, TemplateRef, viewChild } from '@angular/core';
import { BsNoNoscriptDirective } from '@mintplayer/ng-bootstrap/no-noscript';
import { BsShellState } from '../shell-state';
import { Breakpoint } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  imports: [NgTemplateOutlet, BsNoNoscriptDirective],
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

  static shellCounter = 0;
  shellId = signal(++BsShellComponent.shellCounter);
  shellToggleId = computed(() => `bs-shell-toggle-${this.shellId()}`);

  public setSize(size: string) {
    this.rootElement().nativeElement.style.setProperty('--size', size);
  }
}
