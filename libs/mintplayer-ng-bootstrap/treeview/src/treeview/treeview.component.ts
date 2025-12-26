import { ChangeDetectionStrategy, Component, SkipSelf, Optional, computed, inject, model } from '@angular/core';
import { SlideUpDownAnimation } from '@mintplayer/ng-animations';

@Component({
  selector: 'bs-treeview',
  templateUrl: './treeview.component.html',
  styleUrls: ['./treeview.component.scss'],
  standalone: false,
  animations: [SlideUpDownAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsTreeviewComponent {

  private parent = inject(BsTreeviewComponent, { skipSelf: true, optional: true });

  level = computed<number>((): number => !this.parent ? 0 : this.parent.level() + 1);
  indentation = computed(() => this.level() * 30);
  isExpanded = model<boolean>(!this.parent);
}
