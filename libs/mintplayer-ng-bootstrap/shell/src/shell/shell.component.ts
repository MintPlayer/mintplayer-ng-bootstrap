import { ChangeDetectionStrategy, Component, computed, ElementRef, input, TemplateRef, ViewChild } from '@angular/core';
import { BsShellState } from '../shell-state';
import { Breakpoint } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsShellComponent {

  sidebarTemplate: TemplateRef<any> | null = null;
  @ViewChild('root') rootElement!: ElementRef<HTMLDivElement>;

  state = input<BsShellState>('auto');
  breakpoint = input<Breakpoint>('md');

  stateClass = computed(() => {
    const state = this.state();
    if (state === 'auto') return null;
    else return state;
  });

  breakpointClass = computed(() => `shell-${this.breakpoint()}`);

  public setSize(size: string) {
    this.rootElement.nativeElement.style.setProperty('--size', size);
  }
}
