import { Component, ElementRef, Input, TemplateRef, ViewChild } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { BsShellState } from '../shell-state';
import { Breakpoint } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-shell',
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss'
})
export class BsShellComponent {
  constructor() {
    this.stateClass$ = this.state$.pipe(map((state) => {
      if (state === 'auto') return null;
      else return state;
    }));
    this.breakpointClass$ = this.breakpoint$.pipe(map(breakpoint => `shell-${breakpoint}`));
  }

  sidebarTemplate: TemplateRef<any> | null = null;
  @ViewChild('root') rootElement!: ElementRef<HTMLDivElement>;

  @Input() set state(value: BsShellState) {
    this.state$.next(value);
  }

  @Input() set breakpoint(value: Breakpoint) {
    this.breakpoint$.next(value);
  }

  state$ = new BehaviorSubject<BsShellState>('auto');
  breakpoint$ = new BehaviorSubject<Breakpoint>('md');
  stateClass$: Observable<string | null>;
  breakpointClass$: Observable<string>;

  public setSize(size: string) {
    this.rootElement.nativeElement.style.setProperty('--size', size);
  }
}
