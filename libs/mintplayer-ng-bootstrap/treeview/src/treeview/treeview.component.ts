import { Component, SkipSelf, Input, Output, EventEmitter, Optional, ViewEncapsulation, HostBinding } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';

@Component({
  selector: 'bs-treeview',
  templateUrl: './treeview.component.html',
  styleUrls: ['./treeview.component.scss'],
  standalone: false,
  encapsulation: ViewEncapsulation.None,
  animations: [SlideUpDownAnimation],
})
export class BsTreeviewComponent {
  constructor(
    @SkipSelf() @Optional() parent: BsTreeviewComponent
  ) {
    const level = !parent ? 0 : parent.level$.value + 1
    this.level$ = new BehaviorSubject<number>(level);
    this.indentation$ = this.level$.pipe(map(level => level * 30));

    this.isExpanded$.next(!parent);
    this.isExpanded$
      .pipe(takeUntilDestroyed())
      .subscribe(isExpanded => this.isExpandedChange.emit(isExpanded));
  }
  
  level$: BehaviorSubject<number>;
  indentation$: Observable<number>;

  //#region isExpanded
  isExpanded$ = new BehaviorSubject<boolean>(false);
  @Output() isExpandedChange = new EventEmitter<boolean>();
  public get isExpanded() {
    return this.isExpanded$.value;
  }
  @Input() public set isExpanded(value: boolean) {
    this.isExpanded$.next(value);
  }
  //#endregion

  @HostBinding('class.d-block') dBlock = true;
}
