import { Component, ElementRef, Input, TemplateRef, ViewChild, signal, computed } from '@angular/core';
import { BsShellState } from '../shell-state';
import { Breakpoint } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  standalone: false,
})
export class BsShellComponent {
  constructor() {
    this.stateClass = computed(() => {
      const state = this.stateSignal();
      if (state === 'auto') return null;
      else return state;
    });
    this.breakpointClass = computed(() => `shell-${this.breakpointSignal()}`);
  }

  sidebarTemplate: TemplateRef<any> | null = null;
  @ViewChild('root') rootElement!: ElementRef<HTMLDivElement>;

  stateSignal = signal<BsShellState>('auto');
  @Input() set state(val: BsShellState) {
    this.stateSignal.set(val);
  }

  breakpointSignal = signal<Breakpoint>('md');
  @Input() set breakpoint(val: Breakpoint) {
    this.breakpointSignal.set(val);
  }
  stateClass;
  breakpointClass;

  public setSize(size: string) {
    this.rootElement.nativeElement.style.setProperty('--size', size);
  }
}
