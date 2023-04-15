import { Component, SkipSelf, Input, Output, EventEmitter, OnDestroy, Optional } from '@angular/core';
import { BehaviorSubject, Observable, Subject, map, takeUntil } from 'rxjs';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';

@Component({
  selector: 'bs-treeview',
  templateUrl: './treeview.component.html',
  styleUrls: ['./treeview.component.scss'],
  animations: [SlideUpDownAnimation]
})
export class BsTreeviewComponent implements OnDestroy {
  constructor(
    @SkipSelf() @Optional() parent: BsTreeviewComponent
  ) {
    const level = !parent ? 0 : parent.level$.value + 1
    this.level$ = new BehaviorSubject<number>(level);
    this.indentation$ = this.level$.pipe(map(level => level * 30));

    this.isExpanded$.next(!parent);
    this.isExpanded$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((isExpanded) => this.isExpandedChange.emit(isExpanded));
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

  destroyed$ = new Subject();
  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
