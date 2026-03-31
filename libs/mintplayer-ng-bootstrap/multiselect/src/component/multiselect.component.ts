import { Component, computed, model, signal, TemplateRef, viewChild, ChangeDetectionStrategy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BsHasOverlayComponent } from '@mintplayer/ng-bootstrap/has-overlay';
import { BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective } from '@mintplayer/ng-bootstrap/dropdown';
import { BsToggleButtonComponent } from '@mintplayer/ng-bootstrap/toggle-button';
import { BsButtonTypeDirective } from '@mintplayer/ng-bootstrap/button-type';
import { Color } from '@mintplayer/ng-bootstrap';

@Component({
  selector: 'bs-multiselect',
  templateUrl: './multiselect.component.html',
  styleUrls: ['./multiselect.component.scss'],
  imports: [NgTemplateOutlet, FormsModule, BsHasOverlayComponent, BsDropdownDirective, BsDropdownToggleDirective, BsDropdownMenuDirective, BsToggleButtonComponent, BsButtonTypeDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsMultiselectComponent<T> {

  readonly headerTemplate = signal<TemplateRef<any> | undefined>(undefined);
  readonly footerTemplate = signal<TemplateRef<any> | undefined>(undefined);
  readonly buttonTemplate = signal<TemplateRef<any> | undefined>(undefined);
  readonly itemTemplate = signal<TemplateRef<any> | undefined>(undefined);
  readonly colors = Color;

  readonly items = model<T[]>([]);
  readonly selectedItems = model<T[]>([]);
  readonly defaultButtonTemplate = viewChild.required<TemplateRef<any>>('defaultButtonTemplate');
  readonly defaultItemTemplate = viewChild.required<TemplateRef<any>>('defaultItemTemplate');

  readonly resolvedButtonTemplate = computed(() => this.buttonTemplate() ?? this.defaultButtonTemplate());
  readonly resolvedItemTemplate = computed(() => this.itemTemplate() ?? this.defaultItemTemplate());

  itemChange(item: T, value: boolean | null) {
    if (value) {
      this.selectedItems.update(v => [...v, item]);
    } else {
      this.selectedItems.update(v => v.filter(i => i !== item));
    }
  }

}
