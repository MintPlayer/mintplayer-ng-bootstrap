import { ChangeDetectionStrategy, Component, computed, model, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { PaginationResponse } from '@mintplayer/pagination';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsTableComponent } from '@mintplayer/ng-bootstrap/table';
import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';
import { DatatableSettings } from '../datatable-settings';
import { DatatableSortBase } from '../datatable-sort-base';
import { BsRowTemplateContext } from '../row-template/row-template.directive';


@Component({
  selector: 'bs-datatable',
  templateUrl: './datatable.component.html',
  styleUrls: ['./datatable.component.scss'],
  imports: [NgTemplateOutlet, BsGridComponent, BsGridRowDirective, BsGridColumnDirective, BsTableComponent, BsPaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsDatatableComponent<TData> extends DatatableSortBase {

  numberOfColumns = computed(() => this.columns().length);

  data = model<PaginationResponse<TData> | undefined>(undefined);

  rowTemplate?: TemplateRef<BsRowTemplateContext<TData>>;

  onPerPageChange(perPage: number) {
    const currentSettings = this.settings();
    this.settings.set(new DatatableSettings({
      ...currentSettings,
      perPage: { ...currentSettings.perPage, selected: perPage },
      page: { ...currentSettings.page, selected: 1 },
    }));
  }

  onPageChange(page: number) {
    const currentSettings = this.settings();
    this.settings.set(new DatatableSettings({
      ...currentSettings,
      page: { ...currentSettings.page, selected: page },
    }));
  }

}
