import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BsDatatableComponent, BsDatatableColumnDirective, BsRowTemplateDirective, DatatableSettings } from '@mintplayer/ng-bootstrap/datatable';
import { BsVirtualDatatableComponent, BsVirtualRowTemplateDirective, VirtualDatatableDataSource } from '@mintplayer/ng-bootstrap/virtual-datatable';
import { BsSelectComponent, BsSelectOption } from '@mintplayer/ng-bootstrap/select';
import { PaginationResponse } from '@mintplayer/pagination';
import { Artist } from '../../../entities/artist';
import { ArtistService } from '../../../services/artist/artist.service';

@Component({
  selector: 'demo-datatables',
  templateUrl: './datatables.component.html',
  styleUrls: ['./datatables.component.scss'],
  imports: [
    FormsModule,
    BsDatatableComponent, BsDatatableColumnDirective, BsRowTemplateDirective,
    BsVirtualDatatableComponent, BsVirtualRowTemplateDirective,
    BsSelectComponent, BsSelectOption,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DatatablesComponent implements OnInit {

  private artistService = inject(ArtistService);

  mode = signal<'regular' | 'virtual'>('regular');

  // Regular datatable
  artists = signal<PaginationResponse<Artist> | undefined>(undefined);
  settings = signal(new DatatableSettings({
    sortColumns: [{ property: 'YearStarted', direction: 'ascending' }],
    perPage: {
      values: [10, 20, 50],
      selected: 20
    },
    page: {
      values: [1],
      selected: 1
    }
  }));

  // Virtual datatable
  virtualSettings = signal(new DatatableSettings({
    sortColumns: [{ property: 'YearStarted', direction: 'ascending' }],
  }));
  virtualDataSource = signal(this.createVirtualDataSource());

  ngOnInit() {
    this.loadArtists();
  }

  loadArtists() {
    this.artistService.pageArtists(this.settings().toPagination())
      .then((response) => {
        this.artists.set(response);
        if (response) {
          this.settings().page.values = Array.from(Array(response.totalPages).keys()).map((p) => p + 1);
        }
      });
  }

  onVirtualSettingsChange() {
    this.virtualDataSource.set(this.createVirtualDataSource());
  }

  private createVirtualDataSource(): VirtualDatatableDataSource<Artist> {
    return new VirtualDatatableDataSource<Artist>(
      (skip, take) => this.artistService.pageArtists({
        sortColumns: this.virtualSettings().sortColumns,
        perPage: take,
        page: Math.floor(skip / take) + 1,
      }).then(response => ({
        data: response?.data ?? [],
        totalRecords: response?.totalRecords ?? 0,
      })),
      50
    );
  }

}
