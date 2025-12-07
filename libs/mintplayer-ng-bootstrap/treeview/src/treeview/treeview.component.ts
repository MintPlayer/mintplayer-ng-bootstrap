import { Component, SkipSelf, Input, Output, EventEmitter, Optional, signal, computed, effect } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';

@Component({
  selector: 'bs-treeview',
  templateUrl: './treeview.component.html',
  styleUrls: ['./treeview.component.scss'],
  standalone: false,
  animations: [SlideUpDownAnimation],
})
export class BsTreeviewComponent {
  constructor(
    @SkipSelf() @Optional() parent: BsTreeviewComponent
  ) {
    const level = !parent ? 0 : parent.level() + 1;
    this.level = signal<number>(level);
    this.indentation = computed(() => this.level() * 30);

    this.isExpanded.set(!parent);
    effect(() => {
      this.isExpandedChange.emit(this.isExpanded());
    });
  }

  level: ReturnType<typeof signal<number>>;
  indentation;

  //#region isExpanded
  isExpanded = signal<boolean>(false);
  @Output() isExpandedChange = new EventEmitter<boolean>();
  //#endregion
}
