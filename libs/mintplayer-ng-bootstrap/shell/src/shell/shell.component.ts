import { Component, ElementRef, Input, TemplateRef, ViewChild } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { BsShellState } from '../shell-state';

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
  }

  sidebarTemplate: TemplateRef<any> | null = null;
  @ViewChild('root') rootElement!: ElementRef<HTMLDivElement>;

  @Input() set state(value: BsShellState) {
    this.state$.next(value);
  }

  state$ = new BehaviorSubject<BsShellState>('auto');
  stateClass$: Observable<string | null>;

  public setSize(size: string) {
    this.rootElement.nativeElement.style.setProperty('--size', size);
  }
}
